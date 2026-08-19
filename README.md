# Hubble Space Telescope Data Processor

A Python tool to search, download, and process Hubble Space Telescope images from user-selected positions and datasets.

## Features

- **Search by Coordinates**: Query Hubble observations using Right Ascension and Declination
- **Search by Object Name**: Find observations of named astronomical objects (e.g., M51, NGC galaxies)
- **Browse Observations**: View available observations with details about instruments, filters, and exposure times
- **Download Data**: Download FITS files from selected observations
- **Image Processing**: Automatically process and display downloaded images
- **Export Images**: Save processed images as PNG files
- **RGB Color Composites**: Combine three matching FITS filter images into a social-media-ready false-color PNG

## Installation

1. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

Run the main program:

```bash
python hubble_processor.py
```

The program will guide you through:

1. **Search Method**: Choose to search by coordinates or object name
2. **View Results**: Browse available observations
3. **Select Data**: Choose which observations to download
4. **Process Images**: Automatically display and save images
5. **Create a Color Composite**: Choose local FITS files for the red, green, and blue channels

### Creating Color Images

Hubble FITS products usually contain intensity data from one filter, rather than a ready-made color photograph. Select option `3` and assign three images with matching pixel dimensions to red, green, and blue. The processor applies an arcsinh stretch to each filter independently and exports an RGB PNG.

For an artistic, false-color M51 composite from the supplied files, you can use the `F814W` image as red, the same image as green, and `F435W` as blue. For scientifically meaningful results, assign filters according to the wavelengths or emission lines you want to emphasize. The printed output records the chosen filter for each RGB channel.

### Example Searches

**By Coordinates:**
- RA: 202.469575 (13h 29m 52.7s)
- Dec: 47.195258 (47° 11' 43")
- Radius: 0.02 degrees

**By Object Name:**
- M51 (Whirlpool Galaxy)
- M31 (Andromeda Galaxy)
- NGC 6302 (Butterfly Nebula)
- Pillars of Creation

## Output

Downloaded files are saved in the `hubble_images` directory, including:
- Original FITS files from MAST archive
- Processed PNG images with enhanced visualization

## Data Source

This tool queries the Mikulski Archive for Space Telescopes (MAST), which hosts all Hubble Space Telescope observations.

## Notes

- Download times vary based on file size and your internet connection
- FITS files can be large (several MB to GB)
- Images are automatically enhanced using logarithmic scaling for better visualization
