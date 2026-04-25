// filepath: home.js
// Homepage JavaScript - FAQ toggle functionality

// Navigate to auth page
function goToAuth() {
  window.location.href = 'auth.html';
}

// Toggle FAQ accordion
function toggleFaq(element) {
  const answer = element.nextElementSibling;
  const arrow = element.querySelector('.faq-arrow');
  
  if (answer.style.maxHeight) {
    answer.style.maxHeight = null;
    arrow.textContent = '+';
    element.classList.remove('active');
  } else {
    // Close all other FAQs
    document.querySelectorAll('.faq-a').forEach(a => {
      a.style.maxHeight = null;
    });
    document.querySelectorAll('.faq-q').forEach(q => {
      q.classList.remove('active');
      q.querySelector('.faq-arrow').textContent = '+';
    });
    
    answer.style.maxHeight = answer.scrollHeight + 'px';
    arrow.textContent = '−';
    element.classList.add('active');
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  console.log('kaOne Homepage loaded');
});