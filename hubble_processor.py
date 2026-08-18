"""Hubble Space Telescope data processor."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterable, Sequence

import numpy as np
from astropy import units as u
from astropy.coordinates import SkyCoord
from astropy.io import fits
from astropy.visualization import astropy_mpl_style
from astroquery.mast import Observations
import matplotlib.pyplot as plt

DEFAULT_SEARCH_RADIUS = 0.02
DEFAULT_OUTPUT_DIR = "hubble_images"


class HubbleDataProcessor:
    """Process Hubble observations and download associated FITS products."""

    def __init__(self, output_dir: str | os.PathLike[str] = DEFAULT_OUTPUT_DIR):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def search_by_coordinates(self, ra: float, dec: float, radius: float = DEFAULT_SEARCH_RADIUS):
        """Search for HST observations around a position in degrees."""
        print(f"\nSearching for Hubble observations at RA={ra}, Dec={dec}")
        print(f"Search radius: {radius} degrees")

        coord = SkyCoord(ra=ra * u.degree, dec=dec * u.degree, frame="icrs")
        obs_table = Observations.query_criteria(
            coordinates=coord,
            radius=radius * u.degree,
            obs_collection="HST",
            dataproduct_type="image",
        )

        if obs_table is not None and len(obs_table) > 0:
            print(f"Found {len(obs_table)} observations")
            return obs_table

        print("No observations found at this location")
        return None

    def search_by_object(self, object_name: str, radius: float = DEFAULT_SEARCH_RADIUS):
        """Search for HST observations by astronomical object name."""
        object_name = object_name.strip()
        if not object_name:
            raise ValueError("Object name cannot be empty")

        print(f"\nSearching for Hubble observations of '{object_name}'")
        obs_table = Observations.query_object(object_name, radius=radius * u.degree)

        if obs_table is not None and len(obs_table) > 0:
            hst_obs = obs_table[obs_table["obs_collection"] == "HST"]
            print(f"Found {len(hst_obs)} HST observations")
            return hst_obs

        print("No observations found")
        return None

    def display_observations(self, obs_table, max_display: int = 20):
        """Display a concise summary of observations."""
        if obs_table is None or len(obs_table) == 0:
            print("No observations to display")
            return

        print("\n" + "=" * 80)
        print("AVAILABLE OBSERVATIONS")
        print("=" * 80)

        for i, obs in enumerate(obs_table[:max_display]):
            print(f"\n[{i}] Observation ID: {obs.get('obs_id', 'N/A')}")
            print(f"    Target: {obs.get('target_name', 'N/A')}")
            print(f"    Instrument: {obs.get('instrument_name', 'N/A')}")
            print(f"    Filters: {obs.get('filters', 'N/A')}")
            print(f"    Exposure Time: {obs.get('t_exptime', 'N/A')} s")

        if len(obs_table) > max_display:
            print(f"\n... and {len(obs_table) - max_display} more observations")

    def download_products(self, obs_table, indices=None, download_dir=None):
        """Download FITS science products for selected observations."""
        if download_dir is None:
            download_dir = self.output_dir

        if indices is not None:
            obs_to_download = obs_table[indices]
        else:
            obs_to_download = obs_table

        print(f"\nDownloading data products for {len(obs_to_download)} observations...")
        data_products = Observations.get_product_list(obs_to_download)
        science_products = Observations.filter_products(
            data_products,
            productType="SCIENCE",
            extension="fits",
        )

        print(f"Found {len(science_products)} science products")
        if len(science_products) == 0:
            print("No science products available for download")
            return None

        manifest = Observations.download_products(science_products, download_dir=str(download_dir))
        print(f"\nDownload complete! Files saved to: {download_dir}")
        return manifest

    @staticmethod
    def _collect_downloaded_files(manifest):
        """Normalize a manifest object into a list of local file paths."""
        if manifest is None:
            return []

        if isinstance(manifest, dict):
            paths = manifest.get("Local Path", [])
        elif hasattr(manifest, "colnames") and "Local Path" in manifest.colnames:
            paths = manifest["Local Path"].tolist()
        elif isinstance(manifest, (list, tuple)):
            paths = list(manifest)
        else:
            paths = [manifest]

        return [str(path) for path in paths if path is not None]

    def process_and_display_image(self, fits_file: str, save_png: bool = True, render_style: str = "graph"):
        """Open a FITS image and save either a clean preview or annotated graph."""
        print(f"\nProcessing image: {fits_file}")

        try:
            with fits.open(fits_file) as hdul:
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

                if len(image_data.shape) == 3:
                    image_data = image_data[image_data.shape[0] // 2]

                plt.figure(figsize=(12, 10))
                plt.style.use(astropy_mpl_style)

                from matplotlib.colors import LogNorm

                image_display = np.nan_to_num(image_data, nan=0.0)
                positive_pixels = image_display[image_display > 0]
                vmin = np.percentile(positive_pixels, 1) if positive_pixels.size else 1
                vmax = np.percentile(image_display, 99)

                if vmin > 0 and vmax > vmin:
                    plt.imshow(
                        image_display,
                        cmap="gray",
                        origin="lower",
                        norm=LogNorm(vmin=vmin, vmax=vmax),
                    )
                else:
                    plt.imshow(image_display, cmap="gray", origin="lower")

                target = header.get("TARGNAME", "Unknown")
                instrument = header.get("INSTRUME", "Unknown")
                filter_name = header.get("FILTER", "Unknown")
                if render_style == "clean":
                    plt.axis("off")
                else:
                    plt.colorbar(label="Intensity")
                    plt.title(f"Hubble Image: {target}\n{instrument} - {filter_name}")

                if save_png:
                    fits_path = Path(fits_file)
                    png_file = fits_path.with_name(f"{fits_path.stem}_clean.png") if render_style == "clean" else fits_path.with_suffix(".png")
                    plt.savefig(png_file, dpi=150, bbox_inches="tight", pad_inches=0 if render_style == "clean" else 0.1)
                    print(f"Saved image as: {png_file}")

                plt.show()

        except Exception as exc:  # pragma: no cover - user-facing error path
            print(f"Error processing image: {exc}")


def prompt_float(label: str, default: float | None = None) -> float:
    """Prompt for a float value, with an optional default."""
    while True:
        raw_value = input(label).strip()
        if raw_value == "" and default is not None:
            return default
        try:
            return float(raw_value)
        except ValueError:
            print("Invalid input. Please enter a numeric value.")


def parse_download_indices(raw_value: str):
    """Parse a compressed comma-separated index list or 'all'."""
    if not raw_value.strip():
        return None
    if raw_value.strip().lower() == "all":
        return None

    try:
        return [int(part.strip()) for part in raw_value.split(",") if part.strip()]
    except ValueError:
        return None


def main():
    """Run the interactive Hubble data processing CLI."""
    print("=" * 80)
    print("HUBBLE SPACE TELESCOPE DATA PROCESSOR")
    print("=" * 80)

    processor = HubbleDataProcessor()

    while True:
        print("\nOptions:")
        print("1. Search by coordinates (RA, Dec)")
        print("2. Search by object name")
        print("3. Exit")

        choice = input("\nEnter your choice (1-3): ").strip()

        if choice == "1":
            ra = prompt_float("Enter Right Ascension (degrees): ")
            dec = prompt_float("Enter Declination (degrees): ")
            radius = prompt_float("Enter search radius (degrees, default=0.02): ", default=DEFAULT_SEARCH_RADIUS)
            obs_table = processor.search_by_coordinates(ra, dec, radius)
        elif choice == "2":
            object_name = input("Enter object name (e.g., M51, NGC 1234): ").strip()
            if not object_name:
                print("Object name cannot be empty.")
                continue

            radius = prompt_float("Enter search radius (degrees, default=0.02): ", default=DEFAULT_SEARCH_RADIUS)
            obs_table = processor.search_by_object(object_name, radius)
        elif choice == "3":
            print("Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")
            continue

        if obs_table is not None and len(obs_table) > 0:
            processor.display_observations(obs_table)

            download = input("\nDownload data? (y/n): ").strip().lower()
            if download == "y":
                indices_input = input("Enter observation indices to download (comma-separated, or 'all'): ").strip()
                indices = parse_download_indices(indices_input)
                if indices is None and indices_input.strip() and indices_input.strip().lower() != "all":
                    print("Invalid indices. Downloading all observations.")
                    indices = None

                manifest = processor.download_products(obs_table, indices)
                if manifest is not None:
                    process = input("\nProcess and display images? (y/n): ").strip().lower()
                    if process == "y":
                        for file_path in processor._collect_downloaded_files(manifest):
                            if file_path.lower().endswith(".fits"):
                                processor.process_and_display_image(file_path)


if __name__ == "__main__":
    main()

