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


// Loading all scripts ...

//window.onload = function(e) {}
