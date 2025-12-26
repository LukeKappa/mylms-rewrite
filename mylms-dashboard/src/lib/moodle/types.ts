export interface MoodleToken {
  token: string;
  privatetoken: string | null;
}

export interface MoodleSiteInfo {
  username: string;
  firstname: string;
  lastname: string;
  fullname: string;
  userid: number;
  siteurl: string;
  userpictureurl: string;
  downloadfiles: number;
  uploadfiles: number;
  release: string;
  version: string;
  mobilecssurl: string;
  functions: any[];
  advancedfeatures: any[];
}

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  displayname: string;
  idnumber: string;
  summary: string;
  summaryformat: number;
  startdate: number;
  enddate: number;
  visible: boolean;
  progress?: number;
  completed?: boolean;
}

export interface CourseSection {
  id: number;
  name: string;
  visible: number;
  summary: string;
  summaryformat: number;
  section: number;
  hiddenbynumsections: number;
  uservisible: boolean;
  modules: CourseModule[];
  activities: Activity[]; // Processed activities
}

export interface CourseModule {
  id: number;
  url: string;
  name: string;
  instance: number;
  contextid: number;
  visible: number;
  uservisible: boolean;
  visibleoncoursepage: number;
  modicon: string;
  modname: string;
  modplural: string;
  availability: any;
  indent: number;
  onclick: string;
  afterlink: any;
  customdata: string;
  noviewlink: boolean;
  completion: number;
  contents?: ModuleContent[];
}

export interface ModuleContent {
  type: string;
  filename: string;
  filepath: string;
  filesize: number;
  fileurl: string;
  timecreated: number;
  timemodified: number;
  sortorder: number;
  mimetype: string;
  isexternalfile: boolean;
  userid: number;
  author: string;
  license: string;
}

export interface Activity {
  id: string;
  name: string;
  type: string;
  url: string;
  modname: string;
  completed?: boolean;
}

export interface ResourceMaps {
  pages: Map<number, string>;
  resources: Map<number, string>;
  folders: Map<number, string>;
  urls: Map<number, string>;
  lessons: Map<number, string>;
  books: Map<number, BookMetadata>;
}

// Book-related types
export interface BookChapter {
  id: string;
  title: string;
  content: string;
  images: BookImage[];
  level: number;
  hidden: boolean;
}

export interface BookImage {
  filename: string;
  url: string;
  size: number;
  mimetype?: string;
}

export interface Book {
  cmid: number;
  instanceId: number;
  courseId: number;
  name: string;
  url: string;
  chapters: BookChapter[];
  totalSize?: number;
}

export interface BookMetadata {
  id: number;
  coursemodule: number;
  name: string;
  intro?: string;
}
