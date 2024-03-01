// SECTIONS
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
        } else {
            entry.target.classList.remove('show');
        }
    });
})

const hiddenElements = document.querySelectorAll('.hidden');
hiddenElements.forEach((el) =>  observer.observe(el));


// TRIANGLES Intersection Observer
const observer_triangles = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
      if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.filter = 'blur(0)';
      } else {
          entry.target.style.opacity = '0';
          entry.target.style.filter = 'blur(15px)';
      }
  });
}, { threshold: 0 });

const hiddenElement_triangles = document.querySelector('#triangles-hidden');
observer_triangles.observe(hiddenElement_triangles);

// Scroll Event for Scaling
document.addEventListener('scroll', function() {
  const scrollPosition = window.scrollY;
  const modelViewer = document.querySelector('#triangles-hidden');

  // Adjust the scaling factor as needed
  const scale = 1 - scrollPosition / 1500;
  const currentTransform = modelViewer.style.transform;

  // Update only the scale part of the transform property
  modelViewer.style.transform = `scale(${scale}) ${currentTransform.replace(/scale\([^\)]+\)/, '')}`;
});



document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });
  
    // Hide the '.see-more' element on scroll
    window.addEventListener('scroll', function() {
      var firstSection = document.querySelector('.header');
      var seeMore = document.querySelector('.see-more');
      if (window.scrollY > window.screenY) {
        seeMore.style.display = 'none';
      }
    });
  });
  
  document.addEventListener("DOMContentLoaded", function() {
    const h2Elements = document.querySelectorAll('.text-box h2');

    // Function to gradually decrease animation duration
    function decreaseAnimationDuration(element, startDuration, endDuration, totalDuration) {
        let currentDuration = startDuration;
        const stepTime = (startDuration - endDuration) / (totalDuration / 10);

        const interval = setInterval(() => {
            currentDuration -= stepTime;
            element.style.animationDuration = `${currentDuration}ms`;

            if (currentDuration <= endDuration) {
                clearInterval(interval);
                // Stop the animation and change the background color
                element.style.animation = 'none';
                element.style.backgroundColor = '#f5a420';
            }
        }, 10);
    }
    // Reset the animation properties
    function resetAnimation(element) {
      element.style.animation = '';
      element.style.backgroundColor = '';
      element.style.animationDuration = '2000ms';
  }
  // Handle animation when the h2 is in view or out of view
  function handleAnimation(entry) {
    if (entry.isIntersecting) {
        decreaseAnimationDuration(entry.target, 500, 20, 1500);
    } else {
        // Reset the animation when the element goes out of view
        resetAnimation(entry.target);
    }
}

    // Set up the Intersection Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            handleAnimation(entry);
        });
    }, {
        root: null,
        threshold: 0.2,
    });

    // Start observing the h2 element
    h2Elements.forEach(h2Element => {
      observer.observe(h2Element);
  });
});

document.addEventListener("DOMContentLoaded", function() {
  const h2Elements = document.querySelectorAll('.text-button h2');

  // Function to gradually decrease animation duration
  function decreaseAnimationDuration(element, startDuration, endDuration, totalDuration) {
      let currentDuration = startDuration;
      const stepTime = (startDuration - endDuration) / (totalDuration / 10);

      const interval = setInterval(() => {
          currentDuration -= stepTime;
          element.style.animationDuration = `${currentDuration}ms`;

          if (currentDuration <= endDuration) {
              clearInterval(interval);
              // Stop the animation and change the background color
              element.style.animation = 'none';
              element.style.backgroundColor = '#f5a420';
          }
      }, 10);
  }
  // Reset the animation properties
  function resetAnimation(element) {
    element.style.animation = '';
    element.style.backgroundColor = '';
    element.style.animationDuration = '2000ms';
}
// Handle animation when the h2 is in view or out of view
function handleAnimation(entry) {
  if (entry.isIntersecting) {
      decreaseAnimationDuration(entry.target, 500, 20, 1500);
  } else {
      // Reset the animation when the element goes out of view
      resetAnimation(entry.target);
  }
}

  // Set up the Intersection Observer
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          handleAnimation(entry);
      });
  }, {
      root: null,
      threshold: 0.2,
  });

  // Start observing the h2 element
  h2Elements.forEach(h2Element => {
    observer.observe(h2Element);
});
});
