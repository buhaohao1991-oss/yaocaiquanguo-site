const revealNodes = document.querySelectorAll(".reveal");
const audio = document.getElementById("intro-audio");
const primaryAudioButton = document.getElementById("audio-toggle");
const secondaryAudioButton = document.getElementById("audio-toggle-secondary");
const audioCard = document.getElementById("audio-card");
const heroVideo = document.getElementById("hero-video");
const footerYear = document.getElementById("footer-year");

if (footerYear) {
  footerYear.textContent = new Date().getFullYear();
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  },
  {
    threshold: 0.16,
    rootMargin: "0px 0px -10% 0px",
  }
);

revealNodes.forEach((node) => revealObserver.observe(node));

function syncAudioButtons(isPlaying) {
  const label = isPlaying ? "暂停旁白" : "播放首页介绍";
  if (primaryAudioButton) {
    primaryAudioButton.textContent = label;
  }
  if (secondaryAudioButton) {
    secondaryAudioButton.textContent = isPlaying ? "暂停旁白" : "播放旁白";
  }
}

function disableAudio(message) {
  if (audioCard) {
    audioCard.classList.add("is-disabled");
  }
  if (primaryAudioButton) {
    primaryAudioButton.disabled = true;
    primaryAudioButton.textContent = message;
  }
  if (secondaryAudioButton) {
    secondaryAudioButton.disabled = true;
    secondaryAudioButton.textContent = message;
  }
}

function toggleAudioPlayback() {
  if (!audio) {
    disableAudio("音频不可用");
    return;
  }

  if (audio.paused) {
    audio.play().catch(() => disableAudio("音频暂不可播放"));
  } else {
    audio.pause();
  }
}

if (primaryAudioButton) {
  primaryAudioButton.addEventListener("click", toggleAudioPlayback);
}

if (secondaryAudioButton) {
  secondaryAudioButton.addEventListener("click", toggleAudioPlayback);
}

if (audio) {
  audio.addEventListener("play", () => syncAudioButtons(true));
  audio.addEventListener("pause", () => syncAudioButtons(false));
  audio.addEventListener("ended", () => syncAudioButtons(false));
  audio.addEventListener("error", () => disableAudio("音频加载失败"));
}

if (heroVideo) {
  heroVideo.addEventListener("error", () => {
    heroVideo.style.display = "none";
  });
}
