const { app, BrowserWindow } = require('electron');
const path = require('path');
const net = require('net');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

let mainWindow;

async function createWindow() {
  const port = await getFreePort();
  process.env.PORT = port;
  process.env.IS_ELECTRON = 'true';
  process.env.NODE_ENV = 'production';
  
  // Start the bundled Express server
  try {
    require(path.join(__dirname, '../dist/server.cjs'));
    console.log(`Started internal Express server on port ${port}`);
  } catch (err) {
    console.error('Failed to start internal server:', err);
  }

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Hide until ready to prevent visual flashing
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Give the server a brief moment to initialize before loading the URL
  setTimeout(() => {
    mainWindow.loadURL(`http://localhost:${port}`);
  }, 1000);

  // Show window when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
