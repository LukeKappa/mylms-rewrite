# Moodle API Exploration Tests - Setup Guide

This directory contains tests to explore what data is exposed by the Moodle API endpoints, particularly for book modules.

## 🎯 Purpose

The tests help you discover:
- What fields are available in the `tool_mobile_get_content` API
- Whether mobile API supports book content
- Alternative methods to fetch book data
- What content needs to be scraped vs fetched via API

## 📋 Setup

1. **Get your Moodle token:**
   - Log in to your Moodle instance
   - You can find the token in cookies or through authentication

2. **Set environment variables:**
   
   Add to your `.env.local`:
   ```bash
   NEXT_PUBLIC_MOODLE_URL=https://mylms.vossie.net
   MOODLE_TOKEN=your_actual_token_here
   TEST_COURSE_ID=123         # Replace with real course ID
   TEST_BOOK_CMID=456         # Replace with real book module ID  
   TEST_BOOK_ID=789           # Replace with real book instance ID
   ```

3. **Find the test IDs:**
   - **Course ID**: Visit a course page → URL: `/course/view.php?id=XXX`
   - **Book CMID**: Visit a book → URL: `/mod/book/view.php?id=XXX`
   - **Book Instance ID**: Run `core_course_get_contents` → check `instance` field

## 🚀 Running the Tests

Run all exploration tests:
```bash
npm test -- api-exploration.test.ts
```

Run with verbose output:
```bash
npm test -- api-exploration.test.ts --verbose
```

Run a specific test:
```bash
npm test -- api-exploration.test.ts -t "should expose book content"
```

## 📊 Expected Output

The tests will log detailed JSON responses showing:
- ✅ Available API endpoints and their responses
- 📄 Fields exposed in each response
- 🔧 Working vs non-working methods
- 📦 Data structure of book modules

## 🔍 Quick Test Without Setup

You can also manually test the API using curl:

```bash
curl "https://mylms.vossie.net/webservice/rest/server.php?wstoken=YOUR_TOKEN&wsfunction=tool_mobile_get_content&moodlewsrestformat=json&component=mod_book&method=mobile_course_view&args[0][name]=cmid&args[0][value]=YOUR_BOOK_CMID&args[1][name]=courseid&args[1][value]=YOUR_COURSE_ID"
```

## 📚 Common API Endpoints Tested

1. `tool_mobile_get_content` - Mobile app content endpoint
2. `mod_book_get_books_by_courses` - Get book metadata
3. `core_course_get_contents` - Get all course module contents
4. `mod_book_view_book` - View a specific book
5. `core_webservice_get_site_info` - List available functions

## 💡 Typical Findings

Based on standard Moodle installations:
- ✅ `mod_book_get_books_by_courses` - Works, provides metadata only
- ⚠️ `tool_mobile_get_content` - May not support all book methods
- ❌ Book chapter content - Often not exposed via API
- ✅ Book structure/intro - Usually available
- 🔄 Chapter content - May require web scraping

## 🐛 Troubleshooting

**Tests are skipped:**
- Make sure environment variables are set in `.env.local`
- Check that `MOODLE_TOKEN` is valid

**API errors:**
- Verify your token has necessary permissions
- Check that the course/book IDs exist and you have access
- Some endpoints may not be available depending on Moodle version/plugins

**No content in responses:**
- This is expected for books in many Moodle installations
- Book chapters typically require web scraping
- The tests will document exactly what IS available
