// CARDS
const observer_cards = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('cards-show');
        } else {
            entry.target.classList.remove('cards-show');
        }
    });
  }, { threshold: 0.2 });
  
  const hiddenElements_cards = document.querySelectorAll('.cards-hidden');
  hiddenElements_cards.forEach((el) => observer_cards.observe(el));


document.addEventListener("DOMContentLoaded", function() {
    const cards = document.querySelectorAll('.cards');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('cards-animate');
            } else {
                entry.target.classList.remove('cards-animate');
            }
        });
    }, {
        threshold: 0.2,
    });

    cards.forEach(card => {
        observer.observe(card);
    });
});

// SKILLS
const observer_skills = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('skills-show');
        } else {
            entry.target.classList.remove('skills-show');
        }
    });
  }, { threshold: 0.2 });
  
  const hiddenElements_skills = document.querySelectorAll('.skills-hidden');
  hiddenElements_skills.forEach((el) => observer_skills.observe(el));

// SKILL BARS

document.addEventListener("DOMContentLoaded", function() {
    const skillItems = document.querySelectorAll('.skills-hidden');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('skills-show');
            } else {
                entry.target.classList.remove('skills-show');
            }
        });
    }, {
        threshold: 0.2
    });

    skillItems.forEach(item => {
        observer.observe(item);
    });
});


document.querySelectorAll('.text-button').forEach(button => {
    button.addEventListener('click', function() {
        this.classList.toggle('active');
    });
});


