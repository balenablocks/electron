const electron = require('electron');

console.log('global', global);

function createWindow () {
	// Create the browser window.
	const win = new electron.BrowserWindow({
		width: 800,
		height: 600,
		frame: false,
		webPreferences: {
			nodeIntegration: true
		}
	})

	// and load the index.html of the app.
	win.loadFile('index.html')
}

electron.app.on('ready', () => {
	setTimeout(createWindow, 3000);
})
