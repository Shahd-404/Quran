export type QuranVerse = {
  chapterId: number
  chapterNameArabic: string | null
  verseKey: string
  verseNumber: number
  uthmaniText: string
}

export type QuranPage = {
  pageNumber: number
  verses: QuranVerse[]
}

export type QuranChapter = {
  id: number
  nameArabic: string
}
