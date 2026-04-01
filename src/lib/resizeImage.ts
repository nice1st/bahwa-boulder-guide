/**
 * 이미지 파일을 FHD(1920px) 이하로 리사이즈 + JPEG 80% 품질로 압축
 * 이미 작은 이미지는 그대로 반환
 */
const MAX_SIZE = 1920
const QUALITY = 0.8

export async function resizeImage(file: File): Promise<File> {
  // 이미지가 아니면 그대로 반환
  if (!file.type.startsWith('image/')) return file

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const { width, height } = img

      // 이미 충분히 작으면 그대로 반환
      if (width <= MAX_SIZE && height <= MAX_SIZE) {
        resolve(file)
        return
      }

      // 비율 유지하며 축소
      const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height)
      const newW = Math.round(width * ratio)
      const newH = Math.round(height * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = newW
      canvas.height = newH

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, newW, newH)

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resized = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), {
              type: 'image/jpeg',
            })
            resolve(resized)
          } else {
            resolve(file)
          }
        },
        'image/jpeg',
        QUALITY,
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(file)
    }

    img.src = url
  })
}
