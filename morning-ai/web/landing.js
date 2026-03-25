'use strict';

// ─── Navbar scroll effect ────────────────────────────────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ─── Scroll reveal ───────────────────────────────────────────────────────────
const observer = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// ─── Demo date ───────────────────────────────────────────────────────────────
const el = document.getElementById('demo-date');
if (el) {
  const now = new Date();
  const days = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const months = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  el.textContent = `${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]} · ${h}h${m}`;
}

// ─── Demo status animation ───────────────────────────────────────────────────
const statusEl = document.getElementById('demo-status');
setTimeout(() => {
  if (statusEl) {
    statusEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Analyse complète';
    statusEl.style.background = 'rgba(74,222,128,0.1)';
    statusEl.style.borderColor = 'rgba(74,222,128,0.25)';
    statusEl.style.color = '#4ade80';
  }
}, 2200);

// ─── Demo typing animation ───────────────────────────────────────────────────
const phrases = [
  'Rédige une réponse à Jean-Pierre...',
  'Résume mes emails non lus...',
  'Crée une tâche pour la démo Renault...',
  'Quelles sont mes urgences du jour ?',
  'Forward le brief à Sarah...',
];

let phraseIdx = 0;
const typingEl = document.getElementById('demo-typing');

function typePhrase(phrase, i = 0) {
  if (!typingEl) return;
  if (i <= phrase.length) {
    typingEl.textContent = phrase.slice(0, i);
    setTimeout(() => typePhrase(phrase, i + 1), 45);
  } else {
    setTimeout(() => erasePhrase(phrase), 2000);
  }
}

function erasePhrase(phrase) {
  if (!typingEl) return;
  const len = typingEl.textContent.length;
  if (len > 0) {
    typingEl.textContent = phrase.slice(0, len - 1);
    setTimeout(() => erasePhrase(phrase), 25);
  } else {
    phraseIdx = (phraseIdx + 1) % phrases.length;
    setTimeout(() => typePhrase(phrases[phraseIdx]), 400);
  }
}

setTimeout(() => typePhrase(phrases[0]), 2500);

// ─── Smooth anchor scroll ────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
