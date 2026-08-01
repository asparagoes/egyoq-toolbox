document.addEventListener('DOMContentLoaded', () => {
  const previewsWrapper = document.getElementById('previewsWrapper');
  const resetBtn = document.getElementById('resetBtn');
  
  // Page Name Logic
  const pageNameInput = document.getElementById('pageNameInput');
  const nameDisplays = document.querySelectorAll('.page-name-display');

  pageNameInput.addEventListener('input', (e) => {
    const val = e.target.value || 'Page Name';
    nameDisplays.forEach(el => el.textContent = val);
  });

  // Upload Elements
  const coverUploadZone = document.getElementById('coverUploadZone');
  const coverInput = document.getElementById('coverInput');
  const coverBtn = document.getElementById('coverBtn');
  const covers = document.querySelectorAll('.fb-cover');

  const profileUploadZone = document.getElementById('profileUploadZone');
  const profileInput = document.getElementById('profileInput');
  const profileBtn = document.getElementById('profileBtn');
  const avatars = document.querySelectorAll('.fb-avatar, .post-avatar');

  let hasCover = false;
  let hasProfile = false;

  // --- Cover Upload Logic ---
  coverBtn.addEventListener('click', () => coverInput.click());
  coverUploadZone.addEventListener('click', (e) => {
    if (e.target !== coverBtn) coverInput.click();
  });

  setupDragAndDrop(coverUploadZone, coverInput, (file) => {
    handleImageUpload(file, covers, () => {
      hasCover = true;
      coverUploadZone.style.borderStyle = 'solid';
      coverUploadZone.querySelector('h3').innerText = 'Cover Uploaded!';
      checkPreviews();
    });
  });

  // --- Profile Upload Logic ---
  profileBtn.addEventListener('click', () => profileInput.click());
  profileUploadZone.addEventListener('click', (e) => {
    if (e.target !== profileBtn) profileInput.click();
  });

  setupDragAndDrop(profileUploadZone, profileInput, (file) => {
    handleImageUpload(file, avatars, () => {
      hasProfile = true;
      profileUploadZone.style.borderStyle = 'solid';
      profileUploadZone.querySelector('h3').innerText = 'Profile Uploaded!';
      checkPreviews();
    });
  });

  // --- Reset Logic ---
  resetBtn.addEventListener('click', () => {
    previewsWrapper.style.display = 'none';
    
    coverInput.value = '';
    covers.forEach(el => el.style.backgroundImage = 'none');
    coverUploadZone.style.borderStyle = 'dashed';
    coverUploadZone.querySelector('h3').innerText = 'Cover Photo';
    hasCover = false;

    profileInput.value = '';
    avatars.forEach(el => el.style.backgroundImage = 'none');
    profileUploadZone.style.borderStyle = 'dashed';
    profileUploadZone.querySelector('h3').innerText = 'Profile Picture';
    hasProfile = false;
  });

  // --- Image Handling Helpers ---
  function setupDragAndDrop(zone, input, callback) {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (e.dataTransfer.files.length) {
        callback(e.dataTransfer.files[0]);
      }
    });

    input.addEventListener('change', (e) => {
      if (e.target.files.length) {
        callback(e.target.files[0]);
      }
    });
  }

  function handleImageUpload(file, elementsToUpdate, onSuccess) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const imgData = e.target.result;
      elementsToUpdate.forEach(el => {
        el.style.backgroundImage = `url(${imgData})`;
      });
      if(onSuccess) onSuccess();
    };
    reader.readAsDataURL(file);
  }

  function checkPreviews() {
    if (hasCover || hasProfile) {
      previewsWrapper.style.display = 'flex';
      // Apply dummy placeholder if profile is missing
      if (!hasProfile) {
         avatars.forEach(el => {
           el.style.backgroundImage = `url('https://ui-avatars.com/api/?name=SPC+Society&background=0D8ABC&color=fff&rounded=true&size=168')`;
         });
      }
    }
  }
});