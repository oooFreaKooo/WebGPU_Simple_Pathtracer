document.addEventListener('DOMContentLoaded', () => {
    const dynamicTextItems = document.querySelectorAll('.wrapper .dynamic-text li');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Add the class to start the animation when the element is in view
                entry.target.classList.add('animate-typing');
            } else {
                // Remove the class to reset the animation when the element is out of view
                entry.target.classList.remove('animate-typing');
            }
        });
    }, {
        // Set a threshold or use multiple thresholds if needed
        threshold: 0.1
    });

    dynamicTextItems.forEach(item => {
        observer.observe(item);
    });
});

document.addEventListener('DOMContentLoaded', () => {
  const dynamicTextItems = document.querySelectorAll('.wrapper .dynamic-text li');

  // Function to generate a random symbol
  function getRandomSymbol() {
      const symbols = "Ⓐ̙⌏⌌Ⓡ̙ 廾 丹 工 片⌌Ⓢ̙";
      return symbols[Math.floor(Math.random() * symbols.length)];
  }

  function dynamicDecodingEffect(textSpan, originalText, index = 0) {
      if (index < originalText.length) {
          let partialOriginal = originalText.substring(0, index);
          let mixedSymbols = '';

          // Create a mix of original text and random symbols for the remaining part
          for (let i = index; i < originalText.length; i++) {
            mixedSymbols += Math.random() > 0.5 ? getRandomSymbol() : originalText.charAt(i);
          }

          textSpan.textContent = partialOriginal + mixedSymbols;
          setTimeout(() => dynamicDecodingEffect(textSpan, originalText, index + 1), 55);
      } else {
          textSpan.textContent = originalText;
      }
  }

  // Function to start the animation with a delay
  function startAnimation(item, delay) {
      setTimeout(() => {
          let textSpan = item.querySelector('span');
          let originalText = textSpan.getAttribute('data-original-text');
          dynamicDecodingEffect(textSpan, originalText);
      }, delay);
  }

  // Function to reset text to original
  function endAnimation(item) {
      let textSpan = item.querySelector('span');
      let originalText = textSpan.getAttribute('data-original-text');
      textSpan.textContent = originalText;
  }

  // Define the observer
  const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              const delay = entry.target.dataset.animationDelay || 0;
              startAnimation(entry.target, parseInt(delay));
          } else {
              endAnimation(entry.target);
          }
      });
  }, { threshold: 0.1 });

  // Store original text, setup observer, and set animation delay for each item
  dynamicTextItems.forEach((item, index) => {
      const textSpan = item.querySelector('span');
      textSpan.setAttribute('data-original-text', textSpan.textContent);

      // Set a data attribute for animation delay
      // Adjust these values based on your CSS animation delays
      const delays = [250, 1250, 3250, 4250]; // Delays in milliseconds
      item.dataset.animationDelay = delays[index % delays.length]; // Cycle through the delays

      observer.observe(item);
  });
});
