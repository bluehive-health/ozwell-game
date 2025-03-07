window.scoreboardManager = {
  loadScores() {
    // Retrieve stored scores or default to an empty array
    const storedScores = JSON.parse(localStorage.getItem('scores') || '[]');
    // Sort descending by score
    return storedScores.sort((a, b) => b.score - a.score);
  },
  renderScores() {
    const tableBody = document.querySelector('#leaderboard-table tbody');
    // Clear anything there
    tableBody.innerHTML = '';
    // Load and display top 5
    this.loadScores().slice(0, 5).forEach((entry, idx) => {
      const row = document.createElement('tr');
      const rankCell = document.createElement('td');
      const nameCell = document.createElement('td');
      const scoreCell = document.createElement('td');
      // add class py-2 and fs-4 to each cell
      rankCell.classList.add('py-2');
      rankCell.classList.add('fs-4');
      nameCell.classList.add('py-2');
      nameCell.classList.add('fs-4');
      scoreCell.classList.add('py-2');
      scoreCell.classList.add('fs-4');
      rankCell.textContent = idx + 1;
      nameCell.textContent = entry.initials;
      scoreCell.textContent = entry.score;
      row.appendChild(rankCell);
      row.appendChild(nameCell);
      row.appendChild(scoreCell);
      tableBody.appendChild(row);
    });
  },
};
