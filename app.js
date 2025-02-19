import express from 'express';
import ffmpeg from 'fluent-ffmpeg';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config('./');

const hostname = process.env.HOST || "localhost";
const subpath = process.env.SUBPATH || "";
const port = 8080;

const app = express();
app.use(express.static('public'));
const upload = multer({ dest: 'uploads/', });
app.use(upload.single('video'));

['public', 'public/converted', 'uploads'].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
});

app.all(`${subpath}/`, (_, res) => {
  res.send(`
    <h1>Welcome to the MOV to MP4 converter!</h1>
    <p>Make POST requests with the file in the <code>video</code> field to <code>${subpath}/upload</code> to upload a .mov file and get a download link to a converted .mp4 file in response, be warned, it might take a while and any other file type will not be accepted.</p>
    <p>Make GET requests to <code>${subpath}/download/:filename</code> to download a previously converted .mov file, which is now in .mp4!</p>
  `);
});

app.post(`${subpath}/upload`, async (req, res) => {
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
          fs.unlinkSync(uploadedVideo.path);
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

app.get(`${subpath}/download/:filename`, (req, res) => {
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

app.listen(port, () => {console.log('started on port:', port, '\nUnder hostname:', hostname, '\nUnder subpath:', subpath, `\nFull link: http://${hostname}:${port}${subpath}`);});