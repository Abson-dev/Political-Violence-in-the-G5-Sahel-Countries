var pop_chad = ee.Image("projects/ee-marivoetwim/assets/tcd_ppp_2020_UNadj_constrained"),
    pop_niger = ee.Image("projects/ee-marivoetwim/assets/ner_ppp_2020_UNadj_constrained"),
    pop_mauritania = ee.Image("projects/ee-marivoetwim/assets/mrt_ppp_2020_UNadj_constrained"),
    pop_burkina = ee.Image("projects/ee-marivoetwim/assets/bfa_ppp_2020_UNadj_constrained"),
    pop_mali = ee.Image("projects/ee-marivoetwim/assets/mli_ppp_2020_UNadj_constrained"),
    WorldPop = ee.ImageCollection("WorldPop/GP/100m/pop"),
    pop_sahel = ee.Image("projects/ee-aboubacarhema94/assets/ACLED/Sahel_pop_2020_UNadj_constrained"),
    sahel_adm2 = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/ACLED/G5_Sahel_adm2"),
    events_diffusion = ee.FeatureCollection("projects/ee-aboubacarhema94/assets/ACLED/G5_Sahel_Diffusion");



    


/*

Author : Aboubacar HEMA
Supervision : Wim MARIVOET
Contact : a.hema@cgiar.org / w.marivoet@cgiar.org
Position : Research Analyst at IFPRI

*/




// year of event
var year = 2018;

//
var distance = 5000;//in metters

var country_adm2 = sahel_adm2;
var pop_sahel = pop_sahel.unmask(0);
Map.centerObject(country_adm2, 6);
Map.addLayer(country_adm2, {color: 'purple'}, 'Sahel  adm2 (OCHA)', 0);
var projection = pop_sahel.projection();
print('Native Resolution:', projection.nominalScale());

//calculating the number of non-null values
print('Number of Conflict event',
      events_diffusion.aggregate_count('event_type'));

//  Vizualise Conflict event layer
var events_diffusion_country_year = events_diffusion
.filter(ee.Filter.eq('year', year));

//calculating the number of non-null values
print('Number of Conflict event in ' + year ,
      events_diffusion_country_year.aggregate_count('event_type'));
/// Use style() to visualize the points
var eventsStyled = events_diffusion_country_year.style({
    color: 'red',
    pointSize: 2,
    pointShape: 'triangle',
    width: 3
});

Map.addLayer(eventsStyled, {}, 'conflict events');
var featureColl_to_geometry = events_diffusion_country_year.geometry();
var buff = featureColl_to_geometry.buffer(distance);
Map.addLayer(buff, {color: 'purple'}, 'within 5km of a political violence event', 1);
/*
var buff = ee.FeatureCollection(buff);
var intersect = function(feature){

  var fc = buff.filterBounds(feature.geometry()).map(function(f){
    var intersects = feature.geometry().intersects(f.geometry())
    return(f.set({intersects: intersects}))
  })
  // aggregate the "intersects" to an array and get the frequency of TRUE.
  // Add that result as a property to the feature.  Any overlaps greater than 1
  // means the feature overlaps with a different feature.
  var status = ee.List(fc.aggregate_array("intersects")).frequency(true)
  return(feature.set({overlaps: status}))

}


var newFields = buff.map(intersect)

print(newFields)

Map.addLayer(newFields)
*/
//print(buff);
var viz_pop = {
  min: 0.0,
  max: 250.0,
  palette: ['24126c', '1fff4f', 'd4ff50']
};

//var pop_sahel =  ee.ImageCollection([pop_chad, pop_niger,pop_burkina, pop_mali, pop_mauritania]).mosaic();

Map.addLayer(pop_sahel.clip(sahel_adm2), viz_pop, 'Population Sahel', 0);

var stats = pop_sahel.reduceRegion({
  reducer: ee.Reducer.sum().unweighted(),
  geometry: buff,
  scale: projection.nominalScale(),
  maxPixels: 1e20});
print(stats,'population exposed count at 100 m');

//CLip Images to buffer Extent --> Mask 
var clippop_sahel = pop_sahel.clip(buff);
Map.addLayer(clippop_sahel, viz_pop, 'inhabitants_inside5km_events Sahel', 0);
//var newFields_sahel = pop_sahel.clip(newFields);
//Map.addLayer(newFields_sahel, viz_pop, 'inhabitants_inside5km_events Sahel 2', 0);
//Create a function to calculate the feature class with ADM2 Name 
var country_pop = pop_sahel.rename('inhabitants_100m');
var clippop_sahel = clippop_sahel.rename('inhabitants_inside5km_events');
var stacked_image = country_pop.addBands(clippop_sahel);
var calculateFeatureSum = function(feature) {
    var events = stacked_image.reduceRegion({
    reducer: ee.Reducer.sum().unweighted(),
    geometry: feature.geometry().buffer(10),
    scale: projection.nominalScale(),
    maxPixels: 1e20
    });
    var adm_level = feature.get('admin2Pcod');
    return ee.Feature(
      feature.geometry(),
      events.set('admin2Pcod', adm_level));
};
 
//Map Function to Create
var Feature_byADM2 = sahel_adm2.map(calculateFeatureSum);
var indicator = function(feature) {
  // 
  var val = ee.Number(feature.get('inhabitants_inside5km_events'))
    .divide(ee.Number(feature.get('inhabitants_100m')))
    ;
  return feature.set('exposed_to_conflict_indicator', val);
};
var Feature_byADM2 = Feature_byADM2
  // Map the function over the collection.
  .map(indicator);
//Export to CSV
Export.table.toDrive({
    collection: Feature_byADM2,
    fileNamePrefix: 'exposed 5km inhabitants 100m_ok' + year,
    description: 'exposed_5km_inhabitants100m_ok' + year ,
    //folder: "", //set based on user preference
    fileFormat: 'CSV',
    selectors: ['admin2Pcod', 'inhabitants_100m','inhabitants_inside5km_events','exposed_to_conflict_indicator']
    });
    
