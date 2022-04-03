/* Accessible modal
No dependencies
 A Ricci, 2021
 */

(function() {
  'use strict';

  const modalTrigger = document.querySelectorAll('button[data-modal]');

  console.log('modal loaded')

  function closeModal(modal, fbt) {
    modal.classList.remove('active');
    fbt.focus();
  }

  modalTrigger.forEach(function(bt) {
    bt.addEventListener('click', function() {console.log('prout')
      var modalTargetText = bt.getAttribute('data-modal');
      let modalTarget = document.getElementById(modalTargetText);
      let overlay = modalTarget.querySelector('div.overlay');
      let btClose = modalTarget.querySelector('button.bt-close');

      function handleKeyEvents(e) {
        if (e.key === 'Escape') {
          closeModal(modalTarget, originalTrigger);
          return;
        }
        const allFocusables = modalTarget.querySelectorAll('a[href]:not([disabled]), button:not([disabled]), textarea:not([disabled]), input[type="text"]:not([disabled]), input[type="radio"]:not([disabled]), input[type="checkbox"]:not([disabled]), select:not([disabled])');
        const theLast = allFocusables[allFocusables.length - 1];
        const theFirst = allFocusables[0];
        if (e.key === 'Tab' || e.keyCode === 9) {
          if (e.shiftKey) /* shift + tab */ {
            if (document.activeElement === theFirst) {
              theLast.focus();
              e.preventDefault();
            }
          } else /* tab */ {
            if (document.activeElement === theLast) {
              theFirst.focus();
              e.preventDefault();
            }
          }
        }
      }

      let originalTrigger = document.activeElement;

      let focusables = modalTarget.querySelectorAll('a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]');
      this.focusables = Array.prototype.slice.call(focusables);

      let firstFocusEl = focusables[0];
      firstFocusEl.focus();

      let lastFocusEl = focusables[focusables.length - 1];

      modalTarget.classList.add('active');

      focusables[0].focus();

      document.addEventListener('keydown', function(e) {
        handleKeyEvents(e);
      });

      overlay.addEventListener('click', function() {
        closeModal(modalTarget, originalTrigger);
      });
      btClose.addEventListener('click', function() {
        closeModal(modalTarget, originalTrigger);
      });
    });
  });

})();
