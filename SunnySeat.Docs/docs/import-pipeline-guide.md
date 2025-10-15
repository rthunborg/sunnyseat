# Building Data Import Pipeline - Documentation

## Overview

The Building Data Import Pipeline is designed to import building footprint data from Lantmäteriet .gpkg files into the PostgreSQL database with PostGIS support. This pipeline provides the foundation for accurate shadow calculations in the Sunny Seat application.

## Prerequisites

### System Requirements
- .NET Framework
- PostgreSQL with PostGIS extension
- GDAL tools (ogr2ogr, ogrinfo) installed and available in PATH

### GDAL Installation

#### Windows
1. Download GDAL from [OSGeo4W](https://trac.osgeo.org/osgeo4w/) or [GDAL releases](https://gdal.org/download.html#windows)
2. Install GDAL and ensure `ogr2ogr` and `ogrinfo` are in your PATH
3. Verify installation: `ogr2ogr --version`

#### Linux/macOS
```bash
# Ubuntu/Debian
sudo apt-get install gdal-bin

# macOS with Homebrew
brew install gdal

# Verify installation
ogr2ogr --version
```

### Database Setup
- PostgreSQL 12+ with PostGIS extension enabled
- Connection string configured in App.config

## Architecture

### Components

1. **IBuildingImportService** - Interface defining import operations
2. **BuildingImportService** - Main service implementing GDAL integration
3. **ImportBuildingsCommand** - Console command for manual execution
4. **Building Entity** - Enhanced with NetTopologySuite spatial types

### Data Flow

```
.gpkg File ? Validation ? ogr2ogr ? PostgreSQL ? Entity Processing ? Database Storage
```

## Usage

### Console Command

#### Basic Import
```bash
SunnySeat.exe import-buildings "path/to/buildings.gpkg"
```

#### Import Specific Layer
```bash
SunnySeat.exe import-buildings "path/to/buildings.gpkg" "building_layer"
```

### Programmatic Usage

```csharp
using (var context = new SunnySeatDbContext())
{
    var connectionString = "Host=localhost;Database=sunnyseat;...";
    var importService = new BuildingImportService(context, connectionString);
    
    var result = await importService.ImportFromGpkgAsync("buildings.gpkg");
    
    if (result.Success)
    {
        Console.WriteLine($"Imported {result.BuildingsImported} buildings");
    }
}
```

## Data Processing

### Coordinate System Transformation
- Source: SWEREF99 (or as specified in .gpkg)
- Target: WGS84 (EPSG:4326)
- Automatic transformation via ogr2ogr `-t_srs EPSG:4326`

### Height Estimation Heuristics

The service implements floor-to-height conversion when height data is missing:

1. **Floor Count Available**: `height = floors × 3.5m`
2. **No Floor Data**: Default minimum height of 6.0m (?2 floors)
3. **Source Tracking**: Heights marked as `floor_heuristic` or `default_heuristic`

### Data Quality Validation

#### File Validation
- File existence and .gpkg extension check
- Layer structure validation via `ogrinfo`
- Coordinate system verification

#### Geometry Validation
- Polygon topology validation
- Non-polygon geometries are skipped with warnings
- Invalid geometries logged as errors

## Database Schema

### Building Table Structure
```sql
CREATE TABLE Buildings (
    Id SERIAL PRIMARY KEY,
    Polygon geometry(Polygon,4326) NOT NULL,
    HeightM DOUBLE PRECISION NOT NULL,
    Source VARCHAR(50),
    Floors INTEGER,
    BuildingType VARCHAR(100),
    SourceId VARCHAR(100),
    SourceCrs VARCHAR(20),
    CreatedAt TIMESTAMP NOT NULL,
    UpdatedAt TIMESTAMP NOT NULL
);

-- Spatial index for efficient queries
CREATE INDEX IX_Buildings_Polygon_Spatial ON Buildings USING GIST (Polygon);
```

## Error Handling

### Common Issues and Solutions

#### 1. GDAL Not Found
```
Error: Failed to execute ogr2ogr: The system cannot find the file specified
```
**Solution**: Install GDAL tools and ensure they're in PATH

#### 2. Database Connection Failed
```
Error: Database connection failed
```
**Solution**: Verify PostgreSQL is running and connection string is correct

#### 3. PostGIS Extension Missing
```
Error: PostGIS extension not found
```
**Solution**: Enable PostGIS extension in PostgreSQL
```sql
CREATE EXTENSION postgis;
```

#### 4. Invalid .gpkg File
```
Error: ogrinfo failed with exit code 1
```
**Solution**: Verify .gpkg file is valid and contains building/polygon data

### Logging and Monitoring

- **Import Results**: Detailed statistics on imported, skipped, and error buildings
- **Progress Tracking**: Real-time progress for large imports
- **Error Reporting**: Comprehensive error messages and warnings
- **Performance Metrics**: Import duration and throughput

## Performance Considerations

### Large Dataset Handling
- Batch processing for efficient database insertion
- Transaction management for data consistency
- Memory optimization for processing large .gpkg files
- Progress reporting for long-running operations

### Optimization Tips
1. **Database Tuning**: Increase `work_mem` for large imports
2. **Parallel Processing**: Consider parallel imports for multiple files
3. **Index Management**: Spatial indexes are created automatically
4. **Connection Pooling**: Reuse database connections when possible

## Testing

### Unit Tests
- Height estimation logic validation
- File validation testing
- Error handling verification
- Import result structure testing

### Integration Tests
- End-to-end import process testing
- Console command execution testing
- Database integration validation

### Test Data Requirements
- Sample .gpkg files with valid building data
- Test database with PostGIS extension
- GDAL tools available in test environment

## Troubleshooting Guide

### Debugging Steps

1. **Verify GDAL Installation**
   ```bash
   ogr2ogr --version
   ogrinfo --version
   ```

2. **Test Database Connection**
   ```bash
   SunnySeat.exe test-db
   ```

3. **Validate .gpkg File**
   ```bash
   ogrinfo "path/to/buildings.gpkg"
   ```

4. **Check Import Logs**
   - Review console output for detailed error messages
   - Check database logs for constraint violations
   - Verify source file permissions

### Common .gpkg File Issues

- **No Building Data**: Ensure .gpkg contains polygon geometry layers
- **Coordinate System**: Verify CRS is supported by GDAL
- **Large Files**: Consider splitting very large files for better performance
- **Encoding Issues**: Ensure file names and paths support Unicode

## Production Deployment

### Environment Setup
1. Install GDAL on production servers
2. Configure PostgreSQL with adequate resources
3. Set up proper backup procedures
4. Monitor disk space for large imports

### Security Considerations
- Validate all input file paths
- Implement proper error handling
- Use least-privilege database accounts
- Log all import operations for audit

### Monitoring
- Track import success/failure rates
- Monitor database growth
- Alert on import failures
- Performance metrics collection

## API Reference

### IBuildingImportService Methods

#### ImportFromGpkgAsync
```csharp
Task<ImportResult> ImportFromGpkgAsync(string gpkgFilePath, string layerName = null)
```
Imports buildings from .gpkg file with optional layer specification.

#### ValidateGpkgFileAsync
```csharp
Task<ValidationResult> ValidateGpkgFileAsync(string gpkgFilePath)
```
Validates .gpkg file structure and format.

#### EstimateHeights
```csharp
int EstimateHeights(IEnumerable<Building> buildings)
```
Applies height estimation heuristics to buildings without height data.

### Result Objects

#### ImportResult
- `Success`: Boolean indicating overall success
- `BuildingsImported`: Count of successfully imported buildings
- `BuildingsSkipped`: Count of skipped buildings (non-polygon, etc.)
- `BuildingsWithErrors`: Count of buildings with processing errors
- `Errors`: List of error messages
- `Warnings`: List of warning messages
- `Duration`: Time taken for import operation

#### ValidationResult
- `IsValid`: Boolean indicating file validity
- `FileFormat`: Detected file format
- `LayerNames`: Available layers in the file
- `CoordinateSystem`: Source coordinate system
- `FeatureCount`: Number of features in the file
- `Errors`: Validation error messages
- `Warnings`: Validation warning messages