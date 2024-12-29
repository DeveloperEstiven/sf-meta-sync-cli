import fs from 'fs'

export const fileUtils = {
  write: (filePath: string, content: string) => {
    fs.writeFileSync(filePath, content)
  },

  read: (filePath: string) => fs.readFileSync(filePath, 'utf-8'),

  exists: (filePath?: string) => (filePath ? fs.existsSync(filePath) : false),

  getFilesByExtension: (dir: string, extension: string) =>
    fs
      .readdirSync(dir)
      .filter(file => file.endsWith(extension))
      .map(file => file.replace(extension, '')),
}
