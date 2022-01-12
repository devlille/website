/* DEVFEST LILLE 2019 */
/* GENERAL FUNCTIONS TO LOAD ON PAGE LOAD */

function ship() {
  const ship = document.getElementById('ship');

  window.addEventListener("scroll", function() {
		if (Math.abs(window.scrollY) == 0) {
			ship.classList.remove('active');
		} else {
      if (Math.abs(window.scrollY) > document.querySelector('.decor').offsetTop - 300) {
        ship.classList.add('active');
      }
		}
  });
}

// scroll event for header
let lastKnownScrollPosition = 0;
let ticking = false;

function doSomething(scrollPos) {
  let header = document.querySelector('#container > header');

  if(scrollPos > 130) {
    header.classList.add('active');
  } else {
    header.classList.remove('active');
  }
}

document.addEventListener('scroll', function(e) {
  lastKnownScrollPosition = window.scrollY;

  if (!ticking) {
    window.requestAnimationFrame(function() {
      doSomething(lastKnownScrollPosition);
      ticking = false;
    });

    ticking = true;
  }
});

// Loading all scripts ...

//window.onload = function(e) {}
