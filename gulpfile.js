const { src, dest, watch, parallel } = require('gulp');
const sassCompiler = require('sass');
const sass = require('gulp-sass')(sassCompiler);
const concat = require('gulp-concat');
const removeCode = require('gulp-remove-code');
const fs = require('fs');
const path = require('path');

function styles() {
  return src('app/style/scss/**/*.scss')
    .pipe(sass())
    .pipe(concat('app.css'))
    .pipe(dest('build'));
}

function scripts() {
  return src('app/scripts/**/*.js')
    .pipe(removeCode({ production: true }))
    .pipe(concat('app.js'))
    .pipe(dest('build'));
}

function generateMaze(cb) {
  const mazeJsonPath = path.join(process.cwd(), 'app/maze.json');
  const outputBluePath = path.join(process.cwd(), 'app/style/graphics/spriteSheets/maze/xmaze_blue.svg');
  const outputWhitePath = path.join(process.cwd(), 'app/style/graphics/spriteSheets/maze/xmaze_white.svg');

  fs.readFile(mazeJsonPath, 'utf8', (err, data) => {
    if (err) { cb(err); return; }
    const { mazeArray } = JSON.parse(data);
    const cellSize = 8;
    const rows = mazeArray.length;
    const cols = mazeArray[0].length;

    const grid = mazeArray.map(line => Array.from(line).map(ch => {
      if (ch === '-') {
        return { isWall: true, type: 'white' };
      } else if (ch === 'X') {
        return { isWall: true, type: 'black' };
      } else {
        return { isWall: false, type: null };
      }
    }));

    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const clusters = [];

    function dfs(r, c, cluster, currentType) {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return;
      if (!grid[r][c].isWall || visited[r][c] || grid[r][c].type !== currentType) return;
      visited[r][c] = true;
      cluster.push({ r, c });
      dfs(r - 1, c, cluster, currentType);
      dfs(r + 1, c, cluster, currentType);
      dfs(r, c - 1, cluster, currentType);
      dfs(r, c + 1, cluster, currentType);
    }

    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        if (grid[r][c].isWall && !visited[r][c]) {
          const cluster = [];
          const currentType = grid[r][c].type;
          dfs(r, c, cluster, currentType);
          clusters.push({ cells: cluster, type: currentType });
        }
      }
    }

    function getSegments(cluster, clusterType) {
      const segments = [];
      cluster.forEach(({ r, c }) => {
        if (r === 0 || !grid[r - 1][c].isWall || grid[r - 1][c].type !== clusterType) {
          segments.push({ start: { x: c, y: r }, end: { x: c + 1, y: r } });
        }
        if (c === cols - 1 || !grid[r][c + 1].isWall || grid[r][c + 1].type !== clusterType) {
          segments.push({ start: { x: c + 1, y: r }, end: { x: c + 1, y: r + 1 } });
        }
        if (r === rows - 1 || !grid[r + 1][c].isWall || grid[r + 1][c].type !== clusterType) {
          segments.push({ start: { x: c + 1, y: r + 1 }, end: { x: c, y: r + 1 } });
        }
        if (c === 0 || !grid[r][c - 1].isWall || grid[r][c - 1].type !== clusterType) {
          segments.push({ start: { x: c, y: r + 1 }, end: { x: c, y: r } });
        }
      });
      return segments;
    }

    function joinSegments(segments) {
      const segs = segments.slice();
      const pathPoints = [];
      const current = segs.shift();
      pathPoints.push(current.start, current.end);

      function pointsEqual(p, q) {
        return p.x === q.x && p.y === q.y;
      }

      while (segs.length > 0) {
        const last = pathPoints[pathPoints.length - 1];
        let idx = segs.findIndex(seg => pointsEqual(seg.start, last));
        if (idx !== -1) {
          const seg = segs.splice(idx, 1)[0];
          pathPoints.push(seg.end);
        } else {
          idx = segs.findIndex(seg => pointsEqual(seg.end, last));
          if (idx !== -1) {
            const seg = segs.splice(idx, 1)[0];
            pathPoints.push(seg.start);
          } else {
            break;
          }
        }
      }

      const pointsStr = pathPoints
        .map((pt, i) => {
          const x = pt.x * cellSize;
          const y = pt.y * cellSize;
          return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        })
        .join(' ');
      return `${pointsStr} Z`;
    }

    let svg = `<svg width="${cols * cellSize}" height="${rows * cellSize}" viewBox="0 0 ${cols * cellSize} ${rows * cellSize}" xmlns="http://www.w3.org/2000/svg">\n`;
    clusters.forEach(clusterObj => {
      const { cells, type } = clusterObj;
      const segs = getSegments(cells, type);
      const d = joinSegments(segs);
      const fillColor = type === 'white' ? 'white' : 'black';
      const strokeAttr = type === 'white' ? 'none' : '#2121FF';
      svg += `  <path d="${d}" fill="${fillColor}" stroke="${strokeAttr}" />\n`;
    });
    svg += '</svg>';

    const svgBlue = svg;
    const svgWhite = svg.replace(/stroke="#2121FF"/g, 'stroke="white"');

    // Add this back if we need to autogenerate the maze SVG
    fs.writeFile(outputBluePath, svgBlue, (writeErr) => {
      if (writeErr) { cb(writeErr); return; }
      console.log('Generated maze_blue.svg');
      fs.writeFile(outputWhitePath, svgWhite, (innerErr) => {
        if (innerErr) { cb(innerErr); return; }
        console.log('Generated maze_white.svg');
        cb();
      });
    });
  });
}

function watchFiles() {
  generateMaze((err) => {
    if (err) {
      console.error('Error building maze SVG:', err);
    }
    watch('app/style/**/*.scss', styles);
    watch('app/scripts/**/*.js', scripts);
    watch('app/maze.json', generateMaze);
  });
}

const build = parallel(styles, scripts, generateMaze);

module.exports = {
  watch: watchFiles,
  default: build,
  generateMazeTask: generateMaze,
};
