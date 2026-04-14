export const uploadImage = async (file: File): Promise<string | null> => {
  const formData = new FormData();
  formData.append('image', file);
  
  try {
    const res = await fetch(`https://api.imgbb.com/1/upload?key=2a21aa2a66d64db0c276f6498bf56364`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (data.success) {
      return data.data.url;
    }
    return null;
  } catch (error) {
    console.error("Error uploading image:", error);
    return null;
  }
};
