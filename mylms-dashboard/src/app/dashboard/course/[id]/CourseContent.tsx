'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { dbService } from '@/lib/indexedDB';
import { CourseHeader } from '@/components/Course/CourseHeader';
import { CourseFilters } from '@/components/Course/CourseFilters';
import { SectionList } from '@/components/Course/SectionList';
import { backendClient } from '@/lib/backendClient';

interface Activity {
  id: string;
  name: string;
  type: string;
  url: string;
  modname: string;
  completed?: boolean;
}

interface CourseSection {
  id: number;
  name: string;
  visible?: number;
  summary?: string;
  section: number;
  uservisible?: boolean;
  modules?: any[];
  activities: Activity[];
}

interface CourseContentProps {
  sections: CourseSection[];
  courseName: string;
}

export function CourseContent({ sections, courseName }: CourseContentProps) {
  // Initialize visibility state
  // Default: Show "Module Essentials" and "Week *" sections
  const [visibleSections, setVisibleSections] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach(section => {
      const name = section.name.toLowerCase();
      if (
        name.includes('module essentials') || 
        name.startsWith('week') || 
        name.includes('week 1') // Fallback for specific naming
      ) {
        initial.add(section.name);
      }
    });
    // If no sections matched (e.g. different naming convention), show all to be safe
    if (initial.size === 0) {
      sections.forEach(s => initial.add(s.name));
    }
    return initial;
  });
  
  // Activity type filter - default to showing only 'book' (Notes)
  const [visibleActivityTypes, setVisibleActivityTypes] = useState<Set<string>>(() => new Set(['book']));
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncStats, setSyncStats] = useState<{total: number, success: number} | null>(null);
  const [totalActivities, setTotalActivities] = useState<number>(0);
  const [clearCacheStatus, setClearCacheStatus] = useState<'idle' | 'clearing' | 'success' | 'error'>('idle');

  const [searchQuery, setSearchQuery] = useState('');
  
  // Track prefetch progress
  const [prefetchProgress, setPrefetchProgress] = useState<{current: number, total: number} | null>(null);
  const prefetchingRef = useRef(false);

  // Background prefetch all book activities on page load using batch API
  useEffect(() => {
    const prefetchAllBooks = async () => {
      // Prevent multiple prefetch runs
      if (prefetchingRef.current) return;
      prefetchingRef.current = true;
      
      const token = localStorage.getItem('moodle_token');
      if (!token) return;
      
      // Collect all book activity URLs that aren't already cached
      const bookUrls: string[] = [];
      for (const section of sections) {
        for (const activity of section.activities) {
          if (activity.modname === 'book' && activity.url) {
            // Check cache first
            const cached = await dbService.getActivity(activity.url);
            if (!cached) {
              bookUrls.push(activity.url);
            }
          }
        }
      }
      
      if (bookUrls.length === 0) {
        console.log('[Prefetch] All books already cached!');
        return;
      }
      
      console.log(`[Prefetch] Fetching ${bookUrls.length} books in single API call...`);
      setPrefetchProgress({ current: 0, total: bookUrls.length });
      
      try {
        // Single batch API call
        const result = await backendClient.batchPrefetch(token, bookUrls);
        
        if (result.success) {
          // Save all successfully fetched items to IndexedDB
          let savedCount = 0;
          for (const item of result.items) {
            if (item.success && item.content) {
              await dbService.saveActivity(item.url, item.content);
              savedCount++;
            }
          }
          
          console.log(`[Prefetch] Complete! Loaded ${result.loaded}/${result.total}, saved ${savedCount} to cache.`);
        } else {
          console.warn('[Prefetch] Batch request failed');
        }
      } catch (e) {
        console.warn('[Prefetch] Error:', e);
      } finally {
        setPrefetchProgress(null);
      }
    };
    
    // Start prefetch after a short delay to let the UI render first
    const timer = setTimeout(prefetchAllBooks, 500);
    return () => clearTimeout(timer);
  }, [sections]);

  const toggleSectionVisibility = (sectionName: string) => {
    const newSet = new Set(visibleSections);
    if (newSet.has(sectionName)) {
      newSet.delete(sectionName);
    } else {
      newSet.add(sectionName);
    }
    setVisibleSections(newSet);
  };

  const toggleAll = () => {
    if (visibleSections.size === sections.length) {
      setVisibleSections(new Set());
    } else {
      setVisibleSections(new Set(sections.map(s => s.name)));
    }
  };

  const toggleActivityType = (type: string) => {
    const newSet = new Set(visibleActivityTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setVisibleActivityTypes(newSet);
  };

  const toggleAllActivityTypes = () => {
    const allTypes = ['book', 'page', 'resource', 'folder', 'lesson', 'url'];
    if (visibleActivityTypes.size === allTypes.length) {
      setVisibleActivityTypes(new Set(['book'])); // Reset to default (Notes only)
    } else {
      setVisibleActivityTypes(new Set(allTypes));
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear all cached content? You will need to download it again.')) {
      return;
    }

    setClearCacheStatus('clearing');
    
    try {
      // Clear client-side cache (IndexedDB)
      await dbService.clear();
      console.log('[CourseContent] IndexedDB cleared');

      // Clear backend cache via Rust API
      const result = await backendClient.clearCache();
      if (result.success) {
        setClearCacheStatus('success');
        console.log('[CourseContent] Backend cache cleared:', result.message);
      } else {
        setClearCacheStatus('error');
        console.error('[CourseContent] Clear backend cache failed:', result.message);
      }
    } catch (err) {
      console.error('[CourseContent] Clear cache error:', err);
      setClearCacheStatus('error');
    } finally {
      // Reset status after 3 seconds
      setTimeout(() => {
        setClearCacheStatus('idle');
        // Reload the page to ensure all UI state is reset and fresh data is fetched
        window.location.reload();
      }, 1000);
    }
  };

  const handleCancelSync = async () => {
    console.log('[CourseContent] Cancelling sync...');
    setIsSyncing(false);
    setSyncStatus('idle');
  };

  const handleSync = async () => {
    console.log('[CourseContent] Starting sync for', filteredSections.length, 'selected sections');
    setIsSyncing(true);
    setSyncStatus('syncing');
    
    const token = localStorage.getItem('moodle_token');
    if (!token) {
      setSyncStatus('error');
      setIsSyncing(false);
      return;
    }
    
    // Collect URLs only from filtered/visible sections
    const urls: string[] = [];
    filteredSections.forEach(section => {
      section.activities.forEach(activity => {
        if (activity.url) urls.push(activity.url);
      });
    });

    setTotalActivities(urls.length);
    console.log('[CourseContent] Collected', urls.length, 'activity URLs');

    try {
      let successCount = 0;
      const scrapedData: { url: string; content: string }[] = [];
      
      // Fetch each activity from Rust backend
      for (const url of urls) {
        try {
          const result = await backendClient.getActivityContent(token, url);
          if (result.success && result.content) {
            successCount++;
            scrapedData.push({ url, content: result.content });
          }
        } catch (e) {
          console.warn('[CourseContent] Failed to fetch activity:', url, e);
        }
      }
      
      setSyncStats({ total: urls.length, success: successCount });
      setSyncStatus('success');

      // Save scraped data to IndexedDB
      if (scrapedData.length > 0) {
        console.log(`[CourseContent] Saving ${scrapedData.length} items to IndexedDB...`);
        try {
          await Promise.all(scrapedData.map(item => 
            dbService.saveActivity(item.url, item.content)
          ));
          console.log('[CourseContent] Successfully saved items to IndexedDB');
        } catch (dbError) {
          console.error('[CourseContent] Failed to save to IndexedDB:', dbError);
        }
      }
    } catch (err) {
      console.error('[CourseContent] Sync error:', err);
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
      // Reset status after 5 seconds
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  
  const handleExportPdf = async () => {
    console.log('[CourseContent] Starting PDF export...');
    setIsExporting(true);
    
    try {
      // Collect book activities from filtered sections and get cached content from IndexedDB
      const exportSections: { name: string; content: string }[] = [];
      
      for (const section of filteredSections) {
        const bookActivities = section.activities.filter(a => a.modname === 'book' && a.url);
        
        if (bookActivities.length === 0) continue;
        
        // Collect all content for this section from cache
        let sectionContent = '';
        for (const activity of bookActivities) {
          const cachedContent = await dbService.getActivity(activity.url);
          if (cachedContent) {
            sectionContent += cachedContent + '\n\n';
            console.log(`[Export] Got cached content for: ${activity.name}`);
          } else {
            console.warn(`[Export] No cached content for: ${activity.name} - skipping`);
          }
        }
        
        if (sectionContent.trim()) {
          exportSections.push({
            name: section.name,
            content: sectionContent,
          });
        }
      }
      
      if (exportSections.length === 0) {
        alert('No cached content to export. Make sure books are loaded (hover or click on them first).');
        setIsExporting(false);
        return;
      }
      
      console.log('[CourseContent] Exporting', exportSections.length, 'sections as PDF');
      const pdfBlob = await backendClient.exportPdf(courseName, exportSections);
      
      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${courseName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('[CourseContent] PDF exported successfully');
    } catch (err) {
      console.error('[CourseContent] PDF export error:', err);
      alert(`PDF export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  console.log('[CourseContent] Rendering with', sections.length, 'total sections');

  // Get all unique activity types present in the course
  const availableActivityTypes = useMemo(() => {
    const types = new Set<string>();
    sections.forEach(section => {
      section.activities.forEach(activity => {
        types.add(activity.modname);
      });
    });
    return Array.from(types).sort();
  }, [sections]);

  const filteredSections = useMemo(() => {
    return sections
      .filter(section => visibleSections.has(section.name))
      .map(section => ({
        ...section,
        activities: section.activities.filter(activity => 
          visibleActivityTypes.has(activity.modname)
        )
      }))
      .map(section => {
        // Apply search filter
        if (!searchQuery) return section;

        // Check if section name matches
        if (section.name.toLowerCase().includes(searchQuery.toLowerCase())) return section;

        // Otherwise filter activities
        const matchingActivities = section.activities.filter(activity => 
          activity.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        
        return {
          ...section,
          activities: matchingActivities
        };
      })
      .filter(section => section.activities.length > 0); // Only show sections with visible activities
  }, [sections, visibleSections, visibleActivityTypes, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <CourseHeader 
          courseName={courseName}
          totalSections={sections.length}
          visibleSections={filteredSections.length}
        />

        <CourseFilters
          sections={sections as any}
          visibleSections={visibleSections}
          onToggleSectionVisibility={toggleSectionVisibility}
          onToggleAllSections={toggleAll}
          availableActivityTypes={availableActivityTypes}
          visibleActivityTypes={visibleActivityTypes}
          onToggleActivityType={toggleActivityType}
          onToggleAllActivityTypes={toggleAllActivityTypes}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          onSync={handleSync}
          onCancelSync={handleCancelSync}
          totalActivities={totalActivities}
          clearCacheStatus={clearCacheStatus}
          onClearCache={handleClearCache}
          isExporting={isExporting}
          onExportPdf={handleExportPdf}
        />
      </div>

      {/* Content List */}
      <SectionList sections={filteredSections as any} />
    </div>
  );
}
