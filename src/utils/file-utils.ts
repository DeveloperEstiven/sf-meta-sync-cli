import fs from 'fs'
import path from 'path'

export const createDirectory = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export const writeFile = (filePath: string, content: string) => {
  fs.writeFileSync(filePath, content)
}

export const readFile = (filePath: string) => fs.readFileSync(filePath, 'utf-8')

export const checkFileExists = (filePath: string) => fs.existsSync(filePath)

export const getFilesWithExtension = (dir: string, extension: string) =>
  fs
    .readdirSync(dir)
    .filter(file => file.endsWith(extension))
    .map(file => path.join(dir, file))
