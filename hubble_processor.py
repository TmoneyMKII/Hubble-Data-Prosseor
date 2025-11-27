"""
Hubble Space Telescope Data Processor
Downloads and processes Hubble images from user-selected positions and datasets
"""

import os
import sys
from astropy.coordinates import SkyCoord
from astropy import units as u
from astroquery.mast import Observations
import matplotlib.pyplot as plt
from astropy.io import fits
from astropy.visualization import astropy_mpl_style, make_lupton_rgb
from astropy.wcs import WCS
import numpy as np


class HubbleDataProcessor:
    """Main class for processing Hubble Space Telescope data"""
    
    def __init__(self, output_dir="hubble_images"):
        """
        Initialize the Hubble Data Processor
        
        Args:
            output_dir (str): Directory to save downloaded images
        """
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
    def search_by_coordinates(self, ra, dec, radius=0.02):
        """
        Search for Hubble observations at specific sky coordinates
        
        Args:
            ra (float): Right Ascension in degrees
            dec (float): Declination in degrees
            radius (float): Search radius in degrees
            
        Returns:
            astropy.table.Table: Table of observations
        """
        print(f"\nSearching for Hubble observations at RA={ra}, Dec={dec}")
        print(f"Search radius: {radius} degrees")
        
        coord = SkyCoord(ra=ra*u.degree, dec=dec*u.degree, frame='icrs')
        
        # Query MAST for HST observations
        obs_table = Observations.query_criteria(
            coordinates=coord,
            radius=radius*u.degree,
            obs_collection="HST",
            dataproduct_type="image"
        )
        
        if len(obs_table) > 0:
            print(f"Found {len(obs_table)} observations")
            return obs_table
        else:
            print("No observations found at this location")
            return None
    
    def search_by_object(self, object_name, radius=0.02):
        """
        Search for Hubble observations of a named astronomical object
        
        Args:
            object_name (str): Name of the astronomical object
            radius (float): Search radius in degrees
            
        Returns:
            astropy.table.Table: Table of observations
        """
        print(f"\nSearching for Hubble observations of '{object_name}'")
        
        obs_table = Observations.query_object(
            object_name,
            radius=radius*u.degree
        )
        
        # Filter for HST only
        if obs_table is not None and len(obs_table) > 0:
            hst_obs = obs_table[obs_table['obs_collection'] == 'HST']
            print(f"Found {len(hst_obs)} HST observations")
            return hst_obs
        else:
            print("No observations found")
            return None
    
    def display_observations(self, obs_table, max_display=20):
        """
        Display summary of available observations
        
        Args:
            obs_table: Table of observations
            max_display (int): Maximum number of observations to display
        """
        if obs_table is None or len(obs_table) == 0:
            print("No observations to display")
            return
        
        print("\n" + "="*80)
        print("AVAILABLE OBSERVATIONS")
        print("="*80)
        
        # Select relevant columns
        columns = ['obs_id', 'target_name', 'instrument_name', 
                   'filters', 't_exptime', 'dataproduct_type']
        
        # Filter columns that exist
        display_cols = [col for col in columns if col in obs_table.colnames]
        
        for i, obs in enumerate(obs_table[:max_display]):
            print(f"\n[{i}] Observation ID: {obs['obs_id']}")
            print(f"    Target: {obs.get('target_name', 'N/A')}")
            print(f"    Instrument: {obs.get('instrument_name', 'N/A')}")
            print(f"    Filters: {obs.get('filters', 'N/A')}")
            print(f"    Exposure Time: {obs.get('t_exptime', 'N/A')} s")
        
        if len(obs_table) > max_display:
            print(f"\n... and {len(obs_table) - max_display} more observations")
    
    def download_products(self, obs_table, indices=None, download_dir=None):
        """
        Download data products for selected observations
        
        Args:
            obs_table: Table of observations
            indices (list): List of observation indices to download (None = all)
            download_dir (str): Directory to save files
            
        Returns:
            manifest: Download manifest
        """
        if download_dir is None:
            download_dir = self.output_dir
        
        if indices is not None:
            obs_to_download = obs_table[indices]
        else:
            obs_to_download = obs_table
        
        print(f"\nDownloading data products for {len(obs_to_download)} observations...")
        
        # Get product list
        data_products = Observations.get_product_list(obs_to_download)
        
        # Filter for science products (FITS files)
        science_products = Observations.filter_products(
            data_products,
            productType="SCIENCE",
            extension="fits"
        )
        
        print(f"Found {len(science_products)} science products")
        
        if len(science_products) == 0:
            print("No science products available for download")
            return None
        
        # Download the products
        manifest = Observations.download_products(
            science_products,
            download_dir=download_dir
        )
        
        print(f"\nDownload complete! Files saved to: {download_dir}")
        return manifest
    
    def process_and_display_image(self, fits_file, save_png=True):
        """
        Process and display a FITS image
        
        Args:
            fits_file (str): Path to FITS file
            save_png (bool): Whether to save as PNG
        """
        print(f"\nProcessing image: {fits_file}")
        
        try:
            # Open FITS file
            with fits.open(fits_file) as hdul:
                # Get image data (usually in first or second extension)
                image_data = None
                header = None
                
                for i, hdu in enumerate(hdul):
                    if hdu.data is not None and len(hdu.data.shape) >= 2:
                        image_data = hdu.data
                        header = hdu.header
                        print(f"Found image data in extension {i}")
                        break
                
                if image_data is None:
                    print("No image data found in FITS file")
                    return
                
                # Handle 3D data (take middle slice if needed)
                if len(image_data.shape) == 3:
                    image_data = image_data[image_data.shape[0]//2]
                
                # Display image
                plt.figure(figsize=(12, 10))
                plt.style.use(astropy_mpl_style)
                
                # Use log scale for better visualization
                from matplotlib.colors import LogNorm
                
                # Remove NaN values for display
                image_display = np.nan_to_num(image_data, nan=0.0)
                
                # Set vmin to exclude zeros/negatives for log scale
                vmin = np.percentile(image_display[image_display > 0], 1) if np.any(image_display > 0) else 1
                vmax = np.percentile(image_display, 99)
                
                if vmin > 0 and vmax > vmin:
                    plt.imshow(image_display, cmap='gray', origin='lower', 
                             norm=LogNorm(vmin=vmin, vmax=vmax))
                else:
                    plt.imshow(image_display, cmap='gray', origin='lower')
                
                plt.colorbar(label='Intensity')
                
                # Add title from header
                target = header.get('TARGNAME', 'Unknown')
                instrument = header.get('INSTRUME', 'Unknown')
                filter_name = header.get('FILTER', 'Unknown')
                
                plt.title(f"Hubble Image: {target}\n{instrument} - {filter_name}")
                
                # Save as PNG
                if save_png:
                    png_file = fits_file.replace('.fits', '.png')
                    plt.savefig(png_file, dpi=150, bbox_inches='tight')
                    print(f"Saved image as: {png_file}")
                
                plt.show()
                
        except Exception as e:
            print(f"Error processing image: {e}")


def main():
    """Main function with user interface"""
    print("="*80)
    print("HUBBLE SPACE TELESCOPE DATA PROCESSOR")
    print("="*80)
    
    processor = HubbleDataProcessor()
    
    while True:
        print("\nOptions:")
        print("1. Search by coordinates (RA, Dec)")
        print("2. Search by object name")
        print("3. Exit")
        
        choice = input("\nEnter your choice (1-3): ").strip()
        
        if choice == "1":
            try:
                ra = float(input("Enter Right Ascension (degrees): "))
                dec = float(input("Enter Declination (degrees): "))
                radius = float(input("Enter search radius (degrees, default=0.02): ") or 0.02)
                
                obs_table = processor.search_by_coordinates(ra, dec, radius)
                
            except ValueError:
                print("Invalid input. Please enter numeric values.")
                continue
                
        elif choice == "2":
            object_name = input("Enter object name (e.g., M51, NGC 1234): ").strip()
            radius = float(input("Enter search radius (degrees, default=0.02): ") or 0.02)
            
            obs_table = processor.search_by_object(object_name, radius)
            
        elif choice == "3":
            print("Goodbye!")
            break
            
        else:
            print("Invalid choice. Please try again.")
            continue
        
        # If observations found, display and download options
        if obs_table is not None and len(obs_table) > 0:
            processor.display_observations(obs_table)
            
            download = input("\nDownload data? (y/n): ").strip().lower()
            if download == 'y':
                indices_input = input("Enter observation indices to download (comma-separated, or 'all'): ").strip()
                
                if indices_input.lower() == 'all':
                    indices = None
                else:
                    try:
                        indices = [int(i.strip()) for i in indices_input.split(',')]
                    except ValueError:
                        print("Invalid indices. Downloading all observations.")
                        indices = None
                
                manifest = processor.download_products(obs_table, indices)
                
                if manifest is not None:
                    # Process downloaded images
                    process = input("\nProcess and display images? (y/n): ").strip().lower()
                    if process == 'y':
                        for file in manifest['Local Path']:
                            if file.endswith('.fits'):
                                processor.process_and_display_image(file)


if __name__ == "__main__":
    main()
