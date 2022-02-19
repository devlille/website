let lastKnownScrollPosition = 0;
let ticking = false;

const header = document.querySelector('#container > header');

function addCSSClassToHeader(scrollPos) {
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
            addCSSClassToHeader(lastKnownScrollPosition);
            ticking = false;
        });

        ticking = true;
    }
});
