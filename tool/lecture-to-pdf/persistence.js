'use strict';
// IndexedDB supports compact typed-array signatures and thumbnails without localStorage's small quota.
const lectureSession = (() => {
  let database;
  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(Error('Browser storage is unavailable.'));
      const request = indexedDB.open('egyoq-lecture-to-pdf', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('sessions');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || Error('Could not open browser storage.'));
      request.onblocked = () => reject(Error('Close other Lecture to PDF tabs to enable saved progress.'));
    });
    return database;
  }
  async function transact(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', mode);
      const request = action(tx.objectStore('sessions'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error || Error('Could not save progress.'));
      tx.onabort = () => reject(tx.error || Error('Saving progress was interrupted.'));
    });
  }
  return {
    load: () => transact('readonly', store => store.get('current')),
    save: state => transact('readwrite', store => store.put(state, 'current')),
    clear: () => transact('readwrite', store => store.delete('current'))
  };
})();
