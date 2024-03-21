

var WorldPop = ee.ImageCollection("WorldPop/GP/100m/pop"),
    pop_sahel = ee.Image("projects/ee-aboubacarhema94/assets/ACLED/Sahel_pop_2020_UNadj_constrained"),
    sahel_adm2 = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/ACLED/G5_Sahel_adm2"),
    events_diffusion = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/ACLED/G5_Sahel_Diffusion"),
    geometry = ee.Geometry.Polygon(
        [[[-19.7019400534855, 29.93665627910383],
          [-19.7019400534855, 5.813630636937255],
          [26.967981821514496, 5.813630636937255],
          [26.967981821514496, 29.93665627910383]]], null, false);

/*

Author : Aboubacar HEMA
Supervision : Wim MARIVOET
Contact : a.hema@cgiar.org / w.marivoet@cgiar.org
Role : Research Analyst at IFPRI

*/




/*
From ACLED site: https://acleddata.com/acled-conflict-index-mid-year-update/
Indicator : Diffusion
Measure : What proportion of the country experiences a high level of violence?
Significance : Many conflicts can occur in a country simultaneously, adding to the geographic spread of conflict across states. This measure is an assessment of the geographic distribution of conflict. Each country is divided into a 10km-by-10km spatial grid. Grid cells that have a population of fewer than 100 people are excluded. Next, ACLED determines how many of a country’s geographic grid cells experience a high level of violence, defined as at least 10 events per year (representing the top 10% of cases).
The Diffusion indicator represents the proportion of high violence grid cells to total cells (i.e. the percentage of geographic area experiencing high levels of violence)



CONFLICT DIFFUSION INDICATOR
This syntax computes the conflict diffusion indicator per adm2/year, comprising the following steps
1. Create a spatial grid of 10km-by-10km 
2. Remove grid cells with less than 100 habitants using population data from WorldPop (pop_country)
3. Identify grid cells with at least 10 conflict events per year using events_diffusion layer
4. Compute the proportion of high violence grid cells to total cells per adm2/year
*/

var chart_function = function(feature,scale,title) {
    var chart =
      ui.Chart.image.histogram({
        image: feature,
        scale: scale,
        region:geometry,
        maxPixels:1e20})
          //.setSeriesNames(['b1'])
          .setOptions({
            title: title,
            hAxis: {
              title: 'pixel values',
              titleTextStyle: {italic: false, bold: true},
            },
            vAxis:
                {title: 'Count', 
                //viewWindow: {min: 0, max: 200000},
                titleTextStyle: {italic: false, bold: true}},
            colors: ['cf513e'],
            backgroundColor: '#feedde'
          });
    print(chart);
};


var viz_pop = {
  min: 0.0,
  max: 250.0,
  palette: ['24126c', '1fff4f', 'd4ff50']
};

// Extract the projection before doing any computation
var projection = pop_sahel.projection();
print('Native Resolution:', projection.nominalScale());

Map.addLayer(pop_sahel.clip(sahel_adm2), viz_pop, 'Population Sahel', 0);
var stats = pop_sahel.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: geometry,
  scale: projection.nominalScale(),
  maxPixels: 1e20,
  tileScale: 16});
print(stats,'population_count at 100 m');
var pop_sahel = pop_sahel.unmask(0);
//country pop layer
var country_pop = pop_sahel.clip(geometry);


////////////////////////////// start conflict diffusion indicator computation///////////////////////////////////////////////



// 
//         1. Create a spatial grid of 10km-by-10km
///////////////////////////////////////////////////////////
/*
100 habitants - 10 events
100 habitants - 5 events (new)
50 habitants - 5 events 
100 habitants - 3 events
100 habitants - 2 events
*/
// Country name

var country = 'Sahel'; 


// year of event
var year = 2018;

//
var pop_seuil = 50;

//
var nb_events = 3;


var country_adm2 = sahel_adm2;
Map.centerObject(country_adm2, 6);
Map.addLayer(country_adm2, {color: 'purple'}, country + '_adm2 (OCHA)', 1);



// ****** Aggregation to 10km ****** //


// Get the projection at required scale
var projectionAt1k = projection.atScale(1000);
var projectionAt10k = projection.atScale(10000);

// Step1: 100m to 1000m
var country_popAt1k = country_pop
  .reduceResolution({
    reducer: ee.Reducer.sum().unweighted(),
    maxPixels: 1024
  })
  // Request the data at the scale and projection
  // of reduced resolution
  .reproject({
    crs: projectionAt1k
  });
// Step2: 1000m to 10000m
var country_popAt10k = country_popAt1k
  .reduceResolution({
    reducer: ee.Reducer.sum().unweighted(),
    maxPixels: 1024
  })
  // Request the data at the scale and projection
  // of reduced resolution
  .reproject({
    crs: projectionAt10k
  });
  
var stats = country_popAt10k.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: geometry,
  scale: projectionAt10k.nominalScale(),
  maxPixels: 1e20,
  tileScale: 16});
print(stats,'population_count at 10 km');

var stats = country_popAt1k.clip(sahel_adm2).reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: geometry,
  scale: projectionAt1k.nominalScale(),
  maxPixels: 1e20,
  tileScale: 16});
print(stats,'population_count at 1 km');

Map.addLayer(country_popAt1k.clip(sahel_adm2), viz_pop, 'Population Sahel 1km', 0);
Map.addLayer(country_popAt10k.clip(sahel_adm2), viz_pop, 'Population Sahel 10km', 0);

///////////////////////////////////////////
///2. Remove grid cells with less than 100 habitants using population data from WorldPop (pop_country)
////////////////////////////////////////////////////////////////////////////////////////////


var country_popAt10k_100 = country_popAt10k.gte(pop_seuil);
var country_popAt10k_100 = country_popAt10k_100.updateMask(country_popAt10k_100.neq(0));
var bin = {min: 0,max: 1,palette: ['red', 'green']};
Map.addLayer(country_popAt10k_100, bin, 'Population 10km gt ' + pop_seuil + ' habitants', 1);
var country_popAt10k_100 = country_popAt10k_100.unmask(0).rename('grid_cells_gte' + pop_seuil + 'habitants');
//chart_function(country_popAt10k_100,10000,'grid cells with more than ' + pop_seuil + ' habitants (pixel values = 1) at 10km');
//check
var country_popAt10k_100Sum = country_popAt10k_100.clip(sahel_adm2).reduceRegion({
    reducer: ee.Reducer.sum().unweighted(),
    geometry: geometry,
    scale: 10000,
    maxPixels: 1e20
    });
    
//print(country_popAt10k_100Sum,'grid cells with more than ' + pop_seuil + ' habitants');

///////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////
//3. Identify grid cells with at least 10 conflict events per year using events_diffusion layer
//////////////////////////////////////////////////////////////////////////////////////////////////

// 3.1 Number of Conflict event

var events_diffusion_country_year = events_diffusion
.filter(ee.Filter.eq('year', year));

//calculating the number of non-null values
print('Number of Conflict event',
      events_diffusion_country_year.aggregate_count('event_type'));
      

// 3.2 Vizualise Conflict event layer

/// Use style() to visualize the points
var eventsStyled = events_diffusion_country_year.style({
    color: 'red',
    pointSize: 1,
    pointShape: 'triangle',
    width: 3
});

Map.addLayer(eventsStyled, {}, 'conflict events');

// 3.3 Create image from conflict events layer

/// add dummy property to use for reduceToImage
var if_events = ee.FeatureCollection(events_diffusion_country_year).map(function(feature){
  return feature.set('dummy',1);
});
//check
print('Check Number of Conflict event',
      if_events.aggregate_count('dummy'));
/// create image contains number of events in each pixel with 10km resolution
var eventsImg = if_events.reduceToImage(['dummy'], ee.Reducer.sum().unweighted())
  .unmask(0)
  .reproject('epsg:4326', null, 10000)
  .clip(geometry);
//print(eventsImg) 
//check
var eventsImgSum = eventsImg.reduceRegion({
    reducer: ee.Reducer.sum().unweighted(),
    geometry: geometry,
    scale: 10000,
    maxPixels: 1e20
    });
    
print(eventsImgSum,'Check Number of Conflict event');
var viz_events = {
  min: 0.0,
  max: 34.0,
  palette: [
    "00ff00","1A492C","071EC4","B5CA36","729EAC","8EA5DE",
    "818991","62A3C3","CCF4FE","74F0B9","yellow","C72144",
    "56613B","C14683","C31C25","5F6253","11BF85","A61B26",
    "99FBC5","188AAA","C2D7F1","B7D9D8","856F96","109C6B",
    "2DE3F4","9A777D","151796","C033D8","510037","640C21",
    "31A191","223AB0","B692AC","2DE3F4",
  ]
};
var eventsImg_viz = eventsImg.updateMask(eventsImg.neq(0));
Map.addLayer(eventsImg_viz.clip(country_adm2), viz_events , 'Number of Conflict event',0);
//chart_function(eventsImg,10000,'Number of Conflict event');

var eventsImg_seuil = eventsImg.gte(nb_events);
var eventsImg_seuil = eventsImg_seuil.updateMask(eventsImg_seuil.neq(0));
var eventsImg_seuil = eventsImg_seuil.unmask(0).rename('grid_cells_gte' + nb_events + ' events');
//chart_function(eventsImg_seuil,10000,'Number of Conflict event  more than ' + nb_events + ' events');
//check
var eventsImg_seuilSum = eventsImg_seuil.reduceRegion({
    reducer: ee.Reducer.sum().unweighted(),
    geometry: geometry,
    scale: 10000,
    maxPixels: 1e20
    });
    
//print(eventsImg_seuilSum,'Check Number of Conflict event  more than ' + nb_events + ' events');


///
var multiplication = country_popAt10k_100.multiply(eventsImg);
//chart_function(multiplication,10000,'Number of Conflict event in more than ' + pop_seuil + 'habitants');
//check
var multiplicationSum = multiplication.reduceRegion({
    reducer: ee.Reducer.sum().unweighted(),
    geometry: geometry,
    scale: 10000,
    maxPixels: 1e20
    });
    
//print(multiplicationSum,'Check Number of Conflict event in more than ' + pop_seuil + ' habitants');



//Identify grid cells with at least 10 conflict events per year 

var multiplication_10 = multiplication.gte(nb_events);
var multiplication_10 = multiplication_10.updateMask(multiplication_10.neq(0));

Map.addLayer(multiplication_10.clip(country_adm2), bin, 'grid cells with at least ' + nb_events + ' conflict events per year with more than ' + pop_seuil + ' habitants', 1);
var multiplication_10 = multiplication_10.unmask(0).rename('grid_cells_gte' + pop_seuil + 'habitants_gte' + nb_events + 'events');
//chart_function(multiplication_10,10000,'grid cells with at least ' + nb_events + ' conflict events with more than ' + pop_seuil + ' habitants');
//Map.addLayer(multiplication_10.clip(country_adm2), bin, 'grid cells with at least 10 conflict events per year with more than 100 habitants', 1);

//check
var multiplication_10Sum = multiplication_10.reduceRegion({
    reducer: ee.Reducer.sum().unweighted(),
    geometry: geometry,
    scale: 10000,
    maxPixels: 1e20
    });
    
//print(multiplication_10Sum,'Check Number of Conflict event more than ' + nb_events + ' per year with more than ' + pop_seuil + ' habitants');


// Stack the bands of multiple images together.
var stacked_image = multiplication_10.addBands(country_popAt10k_100);
//Create a function to calculate the feature class with ADM2 Name 
var calculateFeatureSum = function(feature) {
    var events = stacked_image.reduceRegion({
    reducer: ee.Reducer.sum().unweighted(),
    geometry: feature.geometry(),//.buffer(10),
    scale: projectionAt10k.nominalScale(),
    maxPixels: 1e20
    });
    var adm_level = feature.get('admin2Pcod');
    return ee.Feature(
      feature.geometry(),
      events.set('admin2Pcod', adm_level));
};
 
//Map Function to Create
var Feature_byADM2 = country_adm2.map(calculateFeatureSum);




// 4. Compute the proportion of high violence grid cells to total cells per adm2/year
var indicator = function(feature) {
  // 
  var val = ee.Number(feature.get('grid_cells_gte' + pop_seuil + 'habitants_gte' + nb_events + 'events'))
    .divide(ee.Number(feature.get('grid_cells_gte' + pop_seuil + 'habitants')))
    ;
  return feature.set('conflict_diffusion_indicator', val);
};
var Feature_byADM2 = Feature_byADM2
  // Map the function over the collection.
  .map(indicator);

//check
// Compute sums of the specified properties.
var properties = ['grid_cells_gte' + pop_seuil + 'habitants_gte' + nb_events + 'events', 'grid_cells_gte' + pop_seuil + 'habitants', 'conflict_diffusion_indicator'];
var sums = Feature_byADM2
    .filter(ee.Filter.notNull(properties))
    .reduceColumns({
      reducer: ee.Reducer.sum().repeat(3),
      selectors: properties
    });

// Print the resultant Dictionary.
//print(sums);

//Export to CSV
Export.table.toDrive({
    collection: Feature_byADM2,
    fileNamePrefix: 'events_diffusion_Count' + country + year + 'grid_cells_gte' + pop_seuil + 'habitants_gte' + nb_events,
    description: 'events_diffusion_Count' + country + year + 'grid_cells_gte' + pop_seuil + 'habitants_gte' + nb_events ,
    //folder: "", //set based on user preference
    fileFormat: 'CSV',
    selectors: ['admin2Pcod', 'grid_cells_gte' + pop_seuil + 'habitants_gte' + nb_events + 'events','grid_cells_gte' + pop_seuil + 'habitants','conflict_diffusion_indicator']
    });
 
////////////////////////////// end conflict diffusion indicator computation///////////////////////////////////////////////

