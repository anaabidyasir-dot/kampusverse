const DB_NAME = 'kampusverse-learning-files'
const STORE_NAME = 'pdf-files'
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Penyimpanan file lokal tidak didukung browser ini.'))
      return
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Database file lokal gagal dibuka.'))
  })
}

export async function saveDemoLessonPdf(id: string, file: File): Promise<void> {
  const db = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(file, id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('PDF gagal disimpan di browser.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Penyimpanan PDF dibatalkan.'))
  })
  db.close()
}

export async function getDemoLessonPdf(id: string): Promise<Blob | null> {
  const db = await openDatabase()
  const result = await new Promise<Blob | null>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(id)
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null)
    request.onerror = () => reject(request.error ?? new Error('PDF lokal tidak dapat dibaca.'))
  })
  db.close()
  return result
}
