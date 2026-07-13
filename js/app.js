// ============================================
// Nimbus — site interactions
// ============================================

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Mobile nav toggle
const navToggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.nav');

if (navToggle && nav) {
  navToggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });
}

// Status ticker — rotates through a few realistic deploy states
const statusMessages = [
  'us-east-1 · distribution deployed · TLS: valid · 12ms edge latency',
  'cache hit ratio 98.7% · WAF: active · origin access control: enforced',
  'route 53 alias resolved · propagation complete · HTTP → HTTPS redirect on',
];

let statusIndex = 0;
const statusText = document.getElementById('statusText');

if (statusText) {
  setInterval(() => {
    statusIndex = (statusIndex + 1) % statusMessages.length;
    statusText.style.opacity = 0;
    setTimeout(() => {
      statusText.textContent = statusMessages[statusIndex];
      statusText.style.opacity = 1;
    }, 250);
  }, 4500);
  statusText.style.transition = 'opacity 0.25s ease';
}

// Contact form — front-end only stub.
// Wire this to API Gateway + Lambda, SES, or a form service (e.g. Formspree) for real submissions.
const contactForm = document.getElementById('contactForm');
const formNote = document.getElementById('formNote');

if (contactForm) {
  contactForm.addEventListener('submit', (event) => {
    event.preventDefault();
    formNote.textContent = 'Thanks — this form is a placeholder. Connect it to your backend of choice to receive messages.';
    contactForm.reset();
  });
}
