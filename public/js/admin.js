function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

function addCommandField() {
  const container = document.getElementById('commandsContainer');
  const row = document.createElement('div');
  row.className = 'command-input-row';
  row.innerHTML = '<input type="text" name="commands" placeholder="Command">' +
    '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>';
  container.appendChild(row);
}
