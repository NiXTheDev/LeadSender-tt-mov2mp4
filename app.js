import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import multer from 'multer';
import fs from 'fs';

const app = express();
app.use(express.static('public'));
const upload = multer({ dest: 'uploads/', });
app.use(upload.single('video'));

app.post('/upload', async (req, res) => {
  try {
    console.log('Received a file upload request');
    const uploadedVideo = req.file;

    if (uploadedVideo.mimetype !== 'video/quicktime') {
      console.log('Invalid file type:', uploadedVideo.mimetype);
      fs.unlinkSync(uploadedVideo.path);
      return res.status(400).send(`Invalid file type!\nFile provided file is of type: ${uploadedVideo.mimetype} (.${uploadedVideo.originalname.split('.')[1]})\nBut only files of type: video/quicktime (.mov) are supported for conversion!`);
    }

    const dest = 'converted/' + uploadedVideo.originalname.split('.')[0] + '.mp4';
    const target = 'public/' + dest;
    console.log('Starting conversion for:', uploadedVideo.originalname);

    await new Promise((resolve, reject) => {
      ffmpeg(uploadedVideo.path)
        .on('end', () => {
          console.log('Conversion completed for:', uploadedVideo.originalname);
          fs.unlinkSync(uploadedVideo.path); // Delete the original file after conversion is completed);
          resolve();
        })
        .on('error', err => {
          console.error('Conversion failed for:', uploadedVideo.originalname, err);
          reject(err);
        })
        .addOutputOptions([
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-strict', 'experimental',
        ])
        .save(target);
    });

    res.send(`http://localhost:8080/download/${uploadedVideo.originalname.split('.')[0]}.mp4`);
  } catch (error) {
    res.status(500).send('Conversion failed');
  }
});

app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const target = 'public/converted/' + filename;
  console.log('Download request for:', filename);

  if (!fs.existsSync(target)) {
    console.log('File not found:', filename);
    return res.status(404).send('File not found');
  }

  console.log('File found, starting download:', filename);
  res.download(target, (err) => {
    if (err) {
      console.error('Error in downloading file:', filename, err);
      return;
    }
    fs.unlink(target, (unlinkErr) => {
      if (unlinkErr) {
        console.error('Error deleting file:', filename, unlinkErr);
      } else {
        console.log('File successfully deleted after download:', filename);
      }
    });
  });
});

app.listen(8080, () => {console.log('started on port 8080');});