const start_btn = document.querySelector('#start-btn');
const clear_btn = document.querySelector('#clear-btn');
const sudoku_result = document.querySelectorAll('.sudoku-result');
const sudoku_input = document.querySelectorAll('.sudoku-input');
const slider = document.querySelector('#slider');
const msg = document.querySelector('#msg');
let speed = 500 - slider.value;

class Sudoku {
    constructor(grid) {
        /**
         * Initialise the variables and domains based on the given grid
         */

        // Throw exception if the grid of the sudoku is not 9x9
        if (grid.length !== 9) throw "Sudoku grid must be 9x9.";
        
        for (let i = 0; i < 9; i++) {
            if (grid[i].length !== 9) throw "Sudoku grid must be 9x9.";
        }
        
        this.explored = 0;

        // Get the variables which are the empty cells in the grid
        this.variables = [];
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (grid[i][j]) {
                    sudoku_result[(i * 9) + j].style.fontWeight = "900";
                } else {
                    this.variables.push([i, j])
                };
            }
        }

        // Assign the value of the empty cells with None initially
        this.values = grid;

        // Assign domains to variables based on unary constraint to ensure node consistency
        this.domains = structuredClone(grid);
        for (let cell of this.variables) {
            let [x, y] = cell;
            this.domains[x][y] = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])

            // Unary constraint on row
            for (let i = 0; i < 9; i++) {
                if (i === y) continue;
                if (this.domains[x][y].has(grid[x][i])) this.domains[x][y].delete(grid[x][i]);
            }

            // Unary constraint on column
            for (let i = 0; i < 9; i++) {
                if (i === x) continue;
                if (this.domains[x][y].has(grid[i][y])) this.domains[x][y].delete(grid[i][y]);
            }

            // Unary constraint on sub-grid
            let start_x = x - (x % 3);
            let start_y = y - (y % 3);

            for (let i = start_x; i < start_x + 3; i++) {
                for (let j = start_y; j < start_y + 3; j++) {
                    if (i === x && j === y) continue;
                    if (this.domains[x][y].has(grid[i][j])) this.domains[x][y].delete(grid[i][j]);
                }
            }
        }
    }
    
    async solve() {
        /**
         * Returns a 2D list of solution
         */

        // Check whether there is a possible solution
        this.explored = 0;

        for (let x = 0; x < 9; x++) {
            for (let y = 0; y < 9; y++) {
                if (this.values[x][y]) {
                for (let i = 0; i < 9; i++) {
                    if (i === y) continue;
                    if (this.values[x][i] == this.values[x][y]) return null;
                }

                for (let i = 0; i < 9; i++) {
                    if (i === x) continue;
                    if (this.domains[i][y] == this.values[x][y]) return null;
                }

                let start_x = x - (x % 3);
                let start_y = y - (y % 3);

                for (let i = start_x; i < start_x + 3; i++) {
                    for (let j = start_y; j < start_y + 3; j++) {
                        if (i === x && j === y) continue;
                        if (this.values[i][j] == this.values[x][y]) return null;
                    }
                }
                }
            }
        }

        let solution = this.backtrack(this.values, this.domains)

        return solution
    }

    async backtrack(values, domains) {
        /**
         * Solve the puzzle by using backtracking search. Recursively calling itself until there is a solution
         */

        // Check whether the puzzle has been solved
        if (values.every(row => row.every(cell => cell !== null))) return values;

        this.explored++;


        // Select an unassigned variable
        let v = this.unassigned_variable(values, domains);
        let [x, y] = v;

        // Iterate over all values in the domain of the cell
        for (let value of domains[x][y]) {
            let new_values = structuredClone(values);
            let new_domains = structuredClone(domains);
            new_values[x][y] = value;
            if (!execute) {
                throw new Error("Execution terminated.");
            }
            msg.textContent = `Solving. ${this.explored} states explored.`;
            for (let i = 0; i < 81; i++) {
                sudoku_result[i].textContent = new_values[Math.floor(i / 9)][i % 9];
            }
            await new Promise(r => setTimeout(r, speed));
            // Check whether the new value assigned is arc consistent
            if (this.consistent(v, new_values)) {
                new_domains[x][y] = new Set([value]);
                // Draw inferences based on the new value assigned
                let inferences = this.ac3(v, new_domains);
                // Consider next option if the cell has no solution
                if (!inferences) continue;
                // Call itself recursively to consider options for other cells
                let result = await this.backtrack(new_values, new_domains);
                if (result) return result;
            }
        }
        return null;
    }

    unassigned_variable(values, domains) {
        /**
         * Select an unassigned variable using Minimum Remaining Values (MRV) and Degree heuristic
         */

        // Initialise the value of MRV which is greater than the maximum possible value
        let mrv = 10
        
        // Initialise the minimum possible value of degree
        let degree = 0;

        let candidate = null;

        let unassgined_variables = []
        for (let i = 0; i < 9; i++) {
            for (let j = 0; j < 9; j++) {
                if (values[i][j] === null) unassgined_variables.push([i, j]);
            }
        }

        for (let v of unassgined_variables) {
            let [x, y] = v;
            if (domains[x][y].size <= mrv) {
                candidate = v;
                mrv = domains[x][y].size;
                let n = this.neighbours(v).length;
                if (n > degree) {
                    candidate = v;
                    degree = n;
                }
            }
        }
        return candidate;
    }

    consistent (v, values) {
        /**
         * Check arc consistency for binary constraint
         */

        for (let neighbour of this.neighbours(v)) {
            let [x, y] = v;
            let [i, j] = neighbour;
            if (values[x][y] === values[i][j]) return false;
        }
        return true;
    }

    neighbours (v) {
        /**
         * Returns neighbours for a given cell
         */

        let [x, y] = v;

        let neighbours = new Set();

        // Neighbours for same row
        for (let i = 0; i < 9; i++) {
            if (!(i === y) && (itemInArray(this.variables, [x, i]))) neighbours.add(JSON.stringify([x, i]));
        }

        // Neighbours for same column
        for (let i = 0; i < 9; i++) {
            if (!(i === x) && (itemInArray(this.variables, [i, y]))) neighbours.add(JSON.stringify([i, y]));
        }

        // Neighbours for same sub-grid
        let start_x = x - (x % 3);
        let start_y = y - (y % 3);

        for (let i = start_x; i < start_x + 3; i++) {
            for (let j = start_y; j < start_y + 3; j++) {
                if (!((i === x) && (j === y)) && (itemInArray(this.variables, [i, j]))) neighbours.add(JSON.stringify([i, j]));
            }
        }

        let neighbours_array = []
        for (let elem of neighbours) {
            neighbours_array.push(JSON.parse(elem));
        }
        return neighbours_array;
    }

    ac3(v, domains) {
        /**
         * Ensure arc consistency for all related nodes of the variable
         */

        let queue = [];
        for (let neighbour of this.neighbours(v)) {
            queue.push([neighbour, v]);
        }

        while (queue.length > 0) {
            let [a, b] = queue.shift();
            if (this.revise(a, b, domains)) {
                // No possible solution
                if (domains[a[0]][b[0]].size === 0) return false;
                let s = new Set(this.neighbours(a));
                let new_neighbours = Array.from(s).filter(function(elem) {
                    return (JSON.stringify(elem) !== JSON.stringify(b))
                });
                for (let c of new_neighbours) {
                    // New inferences only can be made if it is the only value in the domain
                    if (domains[a[0]][a[1]].size === 1) queue.push([c, a]);
                }
            }
        }
        return true;
    }

    revise(a, b, domains) {
        /**
         * Ensure arc consistency between two nodes
         */
        for (let value of domains[a[0]][a[1]]) {
            // Remove duplicate values if it is inconsistent between two nodes
            if (domains[b[0]][b[1]].has(value)) {
                domains[a[0]][a[1]].delete(value);
                return true;
            }
        }
        return false;
    }
}

// Check if an array is in another array
function itemInArray(arr, item) {
    return arr.some(elem => {
        return JSON.stringify(elem) === JSON.stringify(item);
    });
}

// Additional functions

let execute;
let s;
let valid_values = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '']

start_btn.addEventListener('click', () => {
    if (start_btn.textContent === 'Start') {
        // Start solving Sudoku    
        let puzzle = []
        let valid = true;
        let all_null = true;
        sudoku_input.forEach(cell => {
            cell.style.background = 'white';
        })
        for (let i = 0; i < 9; i++) {
            let row = []
            for (let j = 0; j < 9; j++) {
                let value = sudoku_input[(i * 9) + j].value
                if (valid_values.includes(value)) {
                    if (value) {
                        row.push(parseInt(sudoku_input[(i * 9) + j].value));
                        all_null = false;
                    } else {
                        row.push(null);
                    }
                } else {
                    valid = false;
                    sudoku_input[(i * 9) + j].style.background = 'pink';
                }
            }
            puzzle.push(row);
        }
        if (all_null) {
            msg.textContent = 'At least 1 number must be given.'
            msg.parentElement.style.background = 'pink';
        }
        if (!valid) {
            msg.textContent = 'Only enter numbers from 1 to 9';
            msg.parentElement.style.background = 'pink';
        }
        if (valid && !all_null) {
            s = new Sudoku(puzzle);
            solve_sudoku();
        } 
    } else if (start_btn.textContent === 'Replay') {
        // Replay
        solve_sudoku();
    } else if (start_btn.textContent === 'Stop') {
        // Stop
        clear_btn.disabled = false;
        start_btn.textContent = 'Replay';
        msg.textContent = 'Stopped';
        msg.parentElement.style.background = 'pink';
        execute = false;
    }
});

slider.addEventListener('input', e => {
    speed = 500 - e.target.value;
})

const solve_sudoku = () => {
    start_btn.textContent = 'Stop';
    clear_btn.disabled = true;
    msg.textContent = 'Solving';
    msg.parentElement.style.background = 'plum';
    execute = true;

    sudoku_input.forEach(cell => {
        cell.style.display = 'none';
    })

    sudoku_result.forEach(cell => {
        cell.style.display = 'block';
    })

    let solved = s.solve();
        solved.then(result => {
            // Finish solving
            clear_btn.disabled = false;
            start_btn.textContent = 'Replay';
            if (result) {
                // Have solution
                msg.textContent = `Done. ${s.explored} states explored.`;
                msg.parentElement.style.background = 'lightgreen';
            }
            else {
                // No solution
                start_btn.disabled = true;
                msg.textContent = 'No solution';
                msg.parentElement.style.background = 'pink';
                for (let i = 0; i < 81; i++) {
                    sudoku_result[i].textContent = s.values[Math.floor(i / 9)][i % 9];
                }
            }
        })
}
 
const clear_sudoku = () => {
    sudoku_input.forEach(cell => {
        cell.style.display = 'block';
        cell.style.background = 'white';
        cell.value = '';
    })

    sudoku_result.forEach(cell => {
        cell.style.display = 'none';
        cell.style.fontWeight = '400';
        cell.textContent = '';
    })
    msg.textContent = 'Fill in the Sudoku puzzle and click "Start". You may also use arrow keys to move around cells.';
    msg.parentElement.style.background = '#fef9c3';
    start_btn.textContent = 'Start';
    clear_btn.disabled = false;
    start_btn.disabled = false;
}

clear_btn.addEventListener('click', () => {
    clear_sudoku();
})

document.addEventListener('keydown', e => {
    for (let i = 0; i < 81; i++) {
        if (sudoku_input[i] === document.activeElement) {
            if (e.key === 'ArrowUp') {
                if (i > 8) {
                    sudoku_input[i - 9].focus();
                }
            }
            else if (e.key === 'ArrowDown' || e.key === 'Enter') {
                if (i < 72) {
                    sudoku_input[i + 9].focus();
                }
            }
            else if (e.key === 'ArrowLeft') {
               if ((i % 9) !== 0) {
                    sudoku_input[i - 1].focus();
            }}
            else if (e.key === 'ArrowRight') {
                if ((i % 9) !== 8) {
                    sudoku_input[i + 1].focus();
            }}
            break;
        }
    }
})

sudoku_input.forEach(elem => {
    elem.addEventListener('change', e => {
        if (!valid_values.includes(e.target.value)) {
            e.target.style.background = 'pink';
        } else {
            e.target.style.background = 'white';
        }
    })
})