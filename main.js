const { app, BrowserWindow, session } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Sahand TV',
    icon: path.join(__dirname, 'icon.ico'),
    backgroundColor: '#08090d',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Hide the default menu bar
  win.setMenuBarVisibility(false)

  // Load the site
  win.loadURL('https://sahandtv.vercel.app')

  // Show a loading screen until the page is ready
  win.webContents.on('did-finish-load', () => {
    win.show()
  })

  // If the site fails to load, show an error page
  win.webContents.on('did-fail-load', () => {
    win.loadFile('offline.html')
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
