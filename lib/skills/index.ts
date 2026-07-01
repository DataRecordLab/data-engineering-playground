import { SECTION_PIPELINE } from './section1';
import { SECTION_QUALITY } from './section2';
import { SECTION_MODELING } from './section3';
import type { SkillSection, SkillLesson } from '@/types';

export const ALL_SECTIONS: SkillSection[] = [
  SECTION_PIPELINE,
  SECTION_QUALITY,
  SECTION_MODELING,
];

export function getSection(sectionId: string): SkillSection | undefined {
  return ALL_SECTIONS.find(s => s.id === sectionId);
}

export function getLesson(sectionId: string, lessonId: string): { section: SkillSection; lesson: SkillLesson } | undefined {
  const section = getSection(sectionId);
  if (!section) return undefined;
  const lesson = section.lessons.find(l => l.id === lessonId);
  if (!lesson) return undefined;
  return { section, lesson };
}

export function getLessonIndex(sectionId: string, lessonId: string): { sectionIdx: number; lessonIdx: number } {
  const sectionIdx = ALL_SECTIONS.findIndex(s => s.id === sectionId);
  if (sectionIdx < 0) return { sectionIdx: -1, lessonIdx: -1 };
  const lessonIdx = ALL_SECTIONS[sectionIdx].lessons.findIndex(l => l.id === lessonId);
  return { sectionIdx, lessonIdx };
}
