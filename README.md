# Political-Violence-in-the-G5-Sahel-Countries

# Conflict Diffusion Indicator: Methodology and Implementation
## Prepared for World Food Programme (WFP) Presentation
**Author**: Aboubacar HEMA, Research Analyst, IFPRI  
**Supervision**: Wim MARIVOET, IFPRI  
**Contact**: a.hema@cgiar.org, w.marivoet@cgiar.org  
**Date**: June 27, 2025

---

## 1. Overview
The **Conflict Diffusion Indicator**, as defined by ACLED, measures the proportion of a country’s geographic area experiencing high levels of violence. This indicator assesses the geographic spread of conflict across administrative level 2 (adm2) regions, using a 10km-by-10km spatial grid. This document outlines the methodology and implementation steps for computing the indicator for the Sahel region (2018 data) using Google Earth Engine (GEE).

### Indicator Definition
- **Measure**: Proportion of grid cells with high violence (≥10 conflict events/year) relative to total qualifying cells (≥100 inhabitants).
- **Significance**: Quantifies the geographic distribution of conflict, aiding in understanding conflict spread and intensity.

---

## 2. Methodology Steps
The computation involves four key steps, implemented in GEE, using WorldPop population data and ACLED conflict event data.

### Step 1: Create a 10km-by-10km Spatial Grid
- **Objective**: Aggregate population data to a 10km resolution grid.
- **Process**:
  - Start with WorldPop population data (`pop_sahel`) at 100m resolution.
  - Aggregate to 1km using `reduceResolution` (sum reducer, unweighted).
  - Further aggregate to 10km using the same method.
  - Reproject to ensure consistent 10km grid (`epsg:4326`).
- **Output**:
  - A 10km raster (`country_popAt10k`) where each pixel represents total population.
  - Visualized with a palette (0–250 inhabitants: purple to yellow-green).
- **Verification**:
  - Compute and print total population at 100m, 1km, and 10km scales.

### Step 2: Remove Grid Cells with Fewer than 100 Inhabitants
- **Objective**: Filter out low-population cells to focus on significant areas.
- **Process**:
  - Apply a threshold (`pop_seuil = 50`, adjustable) to the 10km population grid.
  - Create a binary mask (`country_popAt10k_100`): 1 for cells with ≥50 inhabitants, 0 otherwise.
  - Rename to `grid_cells_gte50habitants`.
- **Output**:
  - A binary raster showing qualifying cells (visualized: red for excluded, green for included).
  - Sum of qualifying cells printed for verification.
- **Note**: ACLED specifies 100 inhabitants; 50 used for sensitivity analysis.

### Step 3: Identify Grid Cells with at Least 10 Conflict Events
- **Objective**: Locate cells with high conflict activity (≥10 events/year).
- **Process**:
  - Filter ACLED `events_diffusion` layer for the specified year (2018).
  - Convert point-based conflict events to a 10km raster (`eventsImg`) using `reduceToImage` (sum reducer).
  - Apply a threshold (`nb_events = 3`, adjustable) to create a binary mask (`eventsImg_seuil`): 1 for cells with ≥3 events, 0 otherwise.
  - Multiply population and conflict masks to identify cells meeting both criteria (`multiplication_10`).
- **Output**:
  - Conflict event points visualized as red triangles.
  - Raster of event counts (palette: green to red).
  - Binary raster of high-violence cells (visualized: red/green).
  - Sums printed for verification.
- **Note**: ACLED specifies 10 events; 3 used for sensitivity analysis.

### Step 4: Compute the Proportion of High-Violence Grid Cells
- **Objective**: Calculate the Conflict Diffusion Indicator per adm2/year.
- **Process**:
  - Stack population and conflict binary rasters (`stacked_image`).
  - Map over `sahel_adm2` to compute:
    - Sum of cells with ≥50 inhabitants and ≥3 events (`grid_cells_gte50habitants_gte3events`).
    - Sum of cells with ≥50 inhabitants (`grid_cells_gte50habitants`).
  - Calculate the indicator as the ratio:  
    \[
    \text{Indicator} = \frac{\text{grid_cells_gte50habitants_gte3events}}{\text{grid_cells_gte50habitants}}
    \]
  - Handle division by zero by setting the indicator to 0 if no qualifying cells exist.
- **Output**:
  - A feature collection (`Feature_byADM2`) with properties:
    - `admin2Pcod`: Administrative code.
    - `grid_cells_gte50habitants_gte3events`: Count of high-violence cells.
    - `grid_cells_gte50habitants`: Count of qualifying cells.
    - `conflict_diffusion_indicator`: Proportion of high-violence cells.
  - Exported as a CSV to Google Drive (`events_diffusion_CountSahel2018grid_cells_gte50habitants_gte3`).
- **Verification**:
  - Sum properties across adm2 regions and print results.

---

## 3. Data Sources
The following datasets were used to compute the Conflict Diffusion Indicator in the Sahel region for 2018:

- **WorldPop**: Global high-resolution population data (100m resolution).  
  WorldPop. (2020). *Global high-resolution population estimates* [Data set]. University of Southampton. https://www.worldpop.org/
- **ACLED**: Conflict event data for the Sahel region, 2018.  
  Armed Conflict Location & Event Data Project (ACLED). (2018). *ACLED conflict event data: Africa (Sahel region)* [Data set]. https://acleddata.com/data-export-tool/
- **UN-OCHA**: Administrative boundaries (level 2) for the Sahel region.  
  United Nations Office for the Coordination of Humanitarian Affairs (OCHA). (2015). *Global Administrative Unit Layers (GAUL): Level 2 boundaries* [Data set]. Food and Agriculture Organization of the United Nations. https://data.humdata.org/dataset/gaul-administrative-boundaries
- **ACLED Methodology**: Definition of the Conflict Diffusion Indicator.  
  Armed Conflict Location & Event Data Project (ACLED). (2025). *ACLED Conflict Index: Mid-year update* [Methodology documentation]. https://acleddata.com/acled-conflict-index-mid-year-update/

**Note**: Data accessed via Google Earth Engine. Contact a.hema@cgiar.org for details on specific dataset versions or usage.

---

## 4. Key Outputs
- **Map Visualizations**:
  - Population rasters (1km, 10km).
  - Binary masks for population (≥50 inhabitants) and high-violence cells (≥3 events).
  - Conflict event points and counts.
- **Console Outputs**:
  - Population sums at multiple resolutions.
  - Counts of conflict events and qualifying cells.
  - Adm2-level indicator summaries.
- **Exported Data**:
  - CSV file with adm2-level results, including the Conflict Diffusion Indicator.

---

## 5. Notes for Implementation
- **Data Sources**:
  - WorldPop: Population data (`pop_sahel`, 100m resolution).
  - ACLED: Conflict event data (`events_diffusion`, point-based).
  - OCHA: Administrative boundaries (`sahel_adm2`, level 2).
- **Parameters**:
  - Population threshold: 50 (adjustable; ACLED default: 100).
  - Event threshold: 3 (adjustable; ACLED default: 10).
  - Year: 2018 (configurable).
- **Considerations**:
  - Ensure `geometry` (Sahel region boundary) is defined.
  - Handle division by zero in indicator calculation.
  - Adjust `maxPixels` and `tileScale` for performance in large regions.
  - Validate thresholds against ACLED methodology or specify if testing alternatives.

---

## 6. Recommendations for WFP
- **Use Case**: The Conflict Diffusion Indicator can inform WFP’s humanitarian planning by identifying regions with widespread violence, prioritizing aid allocation.
- **Visualization**: Include maps in presentations to show conflict spread (e.g., high-violence cells overlaid on adm2 boundaries).
- **Extensions**:
  - Compute the indicator for multiple years to analyze trends.
  - Test multiple thresholds (e.g., 100 inhabitants, 10 events) for robustness.
  - Export rasters for GIS integration in WFP’s workflows.
- **Next Steps**:
  - Validate data inputs (WorldPop, ACLED, OCHA).
  - Run the script for additional Sahel countries or years.
  - Integrate results into WFP’s dashboards or reports.

---

## 7. Contact
For further details or assistance with implementation, contact:
- Aboubacar HEMA (a.hema@cgiar.org)
- Wim MARIVOET (w.marivoet@cgiar.org)
 
