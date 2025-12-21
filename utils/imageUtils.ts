
export const processImageFile = (file: File): Promise<{ dataUri: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                const MAX_HEIGHT = 1024;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                // For JPEG, you can control quality. For PNG, it's lossless.
                const dataUri = canvas.toDataURL(file.type, 0.9);
                resolve({ dataUri, mimeType: file.type });
            };
            img.onerror = reject;
            if (typeof event.target?.result === 'string') {
              img.src = event.target.result;
            } else {
              reject(new Error('Failed to read file as data URL'));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};
