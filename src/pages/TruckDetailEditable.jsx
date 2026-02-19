import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import TruckActivityTimeline from '../components/TruckActivityTimeline';
import { truckAPI } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { 
  ArrowLeft, Edit, Truck as TruckIcon, Wrench, Save, X,
  Gauge, Cog, Wind, Zap, Droplet, Thermometer,
  Calendar, Loader2
} from 'lucide-react';

const TruckDetailEditContext = React.createContext(null);

const InfoRow = ({ label, value, section, field, editable = true, fullWidth = false, type = "text" }) => {
  const ctx = React.useContext(TruckDetailEditContext);
  const isEditing = ctx?.isEditing;
  const updateNestedField = ctx?.updateNestedField;
  const updateField = ctx?.updateField;

  return (
    <div className={fullWidth ? "col-span-2 md:col-span-3" : ""}>
      <label className="text-sm font-medium text-gray-600">{label}</label>
      {isEditing && editable ? (
        <Input
          type={type}
          value={value ?? ""}
          onChange={(e) =>
            section
              ? updateNestedField?.(section, field, e.target.value)
              : updateField?.(field, e.target.value)
          }
          className="mt-1"
          placeholder={`Enter ${label.toLowerCase()}`}
        />
      ) : (
        <p className="text-base mt-1 text-gray-900">{value || "N/A"}</p>
      )}
    </div>
  );
};

const TextAreaRow = ({ label, value, field, fullWidth = true }) => {
  const ctx = React.useContext(TruckDetailEditContext);
  const isEditing = ctx?.isEditing;
  const updateField = ctx?.updateField;

  return (
    <div className={fullWidth ? "col-span-2 md:col-span-3" : ""}>
      <label className="text-sm font-medium text-gray-600">{label}</label>
      {isEditing ? (
        <Textarea
          value={value ?? ""}
          onChange={(e) => updateField?.(field, e.target.value)}
          className="mt-1"
          placeholder={`Enter ${label.toLowerCase()}`}
          rows={3}
        />
      ) : (
        <p className="text-base mt-1 text-gray-900 whitespace-pre-wrap">{value || "N/A"}</p>
      )}
    </div>
  );
};

const TruckDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTruck, setEditedTruck] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTruck = async () => {
      try {
        const response = await truckAPI.get(id);
        setTruck(response.data);
        setEditedTruck(JSON.parse(JSON.stringify(response.data))); // Deep copy
      } catch (error) {
        console.error('Error fetching truck:', error);
        setError('Failed to load truck details');
      } finally {
        setLoading(false);
      }
    };

    fetchTruck();
  }, [id]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedTruck(JSON.parse(JSON.stringify(truck))); // Deep copy for editing
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedTruck(JSON.parse(JSON.stringify(truck))); // Reset to original
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await truckAPI.update(id, editedTruck);
      setTruck(response.data);
      setEditedTruck(JSON.parse(JSON.stringify(response.data)));
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating truck:', error);
      setError(error.response?.data?.detail || 'Failed to update truck details');
    } finally {
      setSaving(false);
    }
  };

  const updateNestedField = (section, field, value) => {
    setEditedTruck(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value
      }
    }));
  };

  const updateField = (field, value) => {
    setEditedTruck(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-12 w-12 animate-spin text-[#124481]" />
        </div>
      </div>
    );
  }

  if (!truck) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Truck not found</h3>
              <Button onClick={() => navigate('/trucks')}>Back to Trucks</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const displayTruck = isEditing ? editedTruck : truck;

  return (
    <TruckDetailEditContext.Provider value={{ isEditing, updateNestedField, updateField }}>
      <div className="min-h-screen bg-gray-50" data-testid="truck-detail-page">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/trucks')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trucks
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {displayTruck.identity?.year} {displayTruck.identity?.make} {displayTruck.identity?.model}
              </h1>
              <p className="text-gray-600">
                {displayTruck.identity?.truck_number || 'No truck number'} • VIN: {displayTruck.identity?.vin || 'N/A'}
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <Badge className="bg-[#289790]">
                {displayTruck.data_completeness || 0}% Complete
              </Badge>
              {!isEditing ? (
                <Button onClick={handleEdit} className="bg-[#124481] hover:bg-[#1E7083]">
                  <Edit className="mr-2 h-4 w-4" /> Edit Truck
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleCancel} variant="outline" disabled={saving}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button onClick={handleSave} className="bg-[#289790] hover:bg-[#1E7083]" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}
        </div>

        {/* Identity */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle className="flex items-center">
              <TruckIcon className="mr-2 h-5 w-5" />
              Vehicle Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Unit ID" value={displayTruck.identity?.unit_id} section="identity" field="unit_id" />
              <InfoRow label="VIN" value={displayTruck.identity?.vin} section="identity" field="vin" />
              <InfoRow label="Year" value={displayTruck.identity?.year} section="identity" field="year" type="number" />
              <InfoRow label="Make" value={displayTruck.identity?.make} section="identity" field="make" />
              <InfoRow label="Model" value={displayTruck.identity?.model} section="identity" field="model" />
              <InfoRow label="Truck Number" value={displayTruck.identity?.truck_number} section="identity" field="truck_number" />
              <InfoRow label="License Plate" value={displayTruck.identity?.license_plate} section="identity" field="license_plate" />
              <InfoRow label="Fleet Assignment" value={displayTruck.identity?.fleet_assignment} section="identity" field="fleet_assignment" />
            </div>
          </CardContent>
        </Card>

        {/* Engine Specifications */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#1E7083] to-[#289790] text-white">
            <CardTitle className="flex items-center">
              <Cog className="mr-2 h-5 w-5" />
              Engine Specifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Manufacturer" value={displayTruck.engine?.manufacturer} section="engine" field="manufacturer" />
              <InfoRow label="Model" value={displayTruck.engine?.model} section="engine" field="model" />
              <InfoRow label="Serial Number" value={displayTruck.engine?.serial_number} section="engine" field="serial_number" />
              <InfoRow label="Displacement" value={displayTruck.engine?.displacement} section="engine" field="displacement" />
              <InfoRow label="Horsepower" value={displayTruck.engine?.horsepower} section="engine" field="horsepower" />
              <InfoRow label="Torque" value={displayTruck.engine?.torque} section="engine" field="torque" />
              <InfoRow label="Fuel Type" value={displayTruck.engine?.fuel_type} section="engine" field="fuel_type" />
              <InfoRow label="Cylinders" value={displayTruck.engine?.cylinders} section="engine" field="cylinders" type="number" />
              <InfoRow label="Aspiration" value={displayTruck.engine?.aspiration} section="engine" field="aspiration" />
              <InfoRow label="ECM Part #" value={displayTruck.engine?.ecm_part_number} section="engine" field="ecm_part_number" />
              <InfoRow label="ECM Software" value={displayTruck.engine?.ecm_software_version} section="engine" field="ecm_software_version" />
              <InfoRow label="Build Date" value={displayTruck.engine?.build_date} section="engine" field="build_date" type="date" />
            </div>
          </CardContent>
        </Card>

        {/* Transmission */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#289790] to-[#1E7083] text-white">
            <CardTitle className="flex items-center">
              <Gauge className="mr-2 h-5 w-5" />
              Transmission
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Manufacturer" value={displayTruck.transmission?.manufacturer} section="transmission" field="manufacturer" />
              <InfoRow label="Model" value={displayTruck.transmission?.model} section="transmission" field="model" />
              <InfoRow label="Serial Number" value={displayTruck.transmission?.serial_number} section="transmission" field="serial_number" />
              <InfoRow label="Type" value={displayTruck.transmission?.transmission_type} section="transmission" field="transmission_type" />
              <InfoRow label="Speeds" value={displayTruck.transmission?.speeds} section="transmission" field="speeds" />
              <InfoRow label="Gear Ratios" value={displayTruck.transmission?.gear_ratios} section="transmission" field="gear_ratios" />
              <InfoRow label="TCM Part #" value={displayTruck.transmission?.tcm_part_number} section="transmission" field="tcm_part_number" />
              <InfoRow label="Clutch Type" value={displayTruck.transmission?.clutch_type} section="transmission" field="clutch_type" />
              <InfoRow label="Oil Type" value={displayTruck.transmission?.oil_type} section="transmission" field="oil_type" />
            </div>
          </CardContent>
        </Card>

        {/* Drivetrain */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle className="flex items-center">
              <Wrench className="mr-2 h-5 w-5" />
              Drivetrain & Axles
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Rear Axle Manufacturer" value={displayTruck.drivetrain?.rear_axle_manufacturer} section="drivetrain" field="rear_axle_manufacturer" />
              <InfoRow label="Rear Axle Model" value={displayTruck.drivetrain?.rear_axle_model} section="drivetrain" field="rear_axle_model" />
              <InfoRow label="Rear Axle Ratio" value={displayTruck.drivetrain?.rear_axle_ratio} section="drivetrain" field="rear_axle_ratio" />
              <InfoRow label="Rear Axle Type" value={displayTruck.drivetrain?.rear_axle_type} section="drivetrain" field="rear_axle_type" />
              <InfoRow label="Front Axle Manufacturer" value={displayTruck.drivetrain?.front_axle_manufacturer} section="drivetrain" field="front_axle_manufacturer" />
              <InfoRow label="Front Axle Model" value={displayTruck.drivetrain?.front_axle_model} section="drivetrain" field="front_axle_model" />
              <InfoRow label="Front Axle Rating" value={displayTruck.drivetrain?.front_axle_rating} section="drivetrain" field="front_axle_rating" />
              <InfoRow label="Suspension Type" value={displayTruck.drivetrain?.suspension_type} section="drivetrain" field="suspension_type" />
            </div>
          </CardContent>
        </Card>

        {/* Emissions System */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-500 text-white">
            <CardTitle className="flex items-center">
              <Wind className="mr-2 h-5 w-5" />
              Emissions & Aftertreatment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Emission Standard" value={displayTruck.emissions?.emission_standard} section="emissions" field="emission_standard" />
              <InfoRow label="DPF Manufacturer" value={displayTruck.emissions?.dpf_manufacturer} section="emissions" field="dpf_manufacturer" />
              <InfoRow label="DPF Part #" value={displayTruck.emissions?.dpf_part_number} section="emissions" field="dpf_part_number" />
              <InfoRow label="SCR Manufacturer" value={displayTruck.emissions?.scr_manufacturer} section="emissions" field="scr_manufacturer" />
              <InfoRow label="SCR Part #" value={displayTruck.emissions?.scr_part_number} section="emissions" field="scr_part_number" />
              <InfoRow label="DEF Capacity" value={displayTruck.emissions?.def_system_capacity} section="emissions" field="def_system_capacity" />
              <InfoRow label="DOC Part #" value={displayTruck.emissions?.doc_part_number} section="emissions" field="doc_part_number" />
              <InfoRow label="EGR System" value={displayTruck.emissions?.egr_system_type} section="emissions" field="egr_system_type" />
              <InfoRow label="DPF Install Date" value={displayTruck.emissions?.dpf_install_date} section="emissions" field="dpf_install_date" type="date" />
              <InfoRow label="SCR Install Date" value={displayTruck.emissions?.scr_install_date} section="emissions" field="scr_install_date" type="date" />
            </div>
          </CardContent>
        </Card>

        {/* Electronics */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Electronics & Control Modules
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="ECM Manufacturer" value={displayTruck.electronics?.ecm_manufacturer} section="electronics" field="ecm_manufacturer" />
              <InfoRow label="ECM Part #" value={displayTruck.electronics?.ecm_part_number} section="electronics" field="ecm_part_number" />
              <InfoRow label="TCM Manufacturer" value={displayTruck.electronics?.tcm_manufacturer} section="electronics" field="tcm_manufacturer" />
              <InfoRow label="TCM Part #" value={displayTruck.electronics?.tcm_part_number} section="electronics" field="tcm_part_number" />
              <InfoRow label="ABS System" value={displayTruck.electronics?.abs_system_manufacturer} section="electronics" field="abs_system_manufacturer" />
              <InfoRow label="ABS Version" value={displayTruck.electronics?.abs_system_version} section="electronics" field="abs_system_version" />
              <InfoRow label="Body Controller" value={displayTruck.electronics?.body_control_module} section="electronics" field="body_control_module" />
              <InfoRow label="Instrument Cluster" value={displayTruck.electronics?.instrument_cluster_type} section="electronics" field="instrument_cluster_type" />
              <InfoRow label="Telematics Device" value={displayTruck.electronics?.telematics_device} section="electronics" field="telematics_device" />
              <InfoRow label="Telematics Provider" value={displayTruck.electronics?.telematics_provider} section="electronics" field="telematics_provider" />
              <InfoRow label="Diagnostic Connector" value={displayTruck.electronics?.diagnostic_connector_type} section="electronics" field="diagnostic_connector_type" />
            </div>
          </CardContent>
        </Card>

        {/* Braking System */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-red-600 to-red-500 text-white">
            <CardTitle className="flex items-center">
              <Gauge className="mr-2 h-5 w-5" />
              Braking System
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Brake Type" value={displayTruck.braking?.brake_type} section="braking" field="brake_type" />
              <InfoRow label="Front Brakes" value={displayTruck.braking?.front_brake_type} section="braking" field="front_brake_type" />
              <InfoRow label="Rear Brakes" value={displayTruck.braking?.rear_brake_type} section="braking" field="rear_brake_type" />
              <InfoRow label="Air Compressor" value={displayTruck.braking?.air_compressor_model} section="braking" field="air_compressor_model" />
              <InfoRow label="Air Dryer" value={displayTruck.braking?.air_dryer_model} section="braking" field="air_dryer_model" />
              <InfoRow label="ABS/EBS System" value={displayTruck.braking?.abs_ebs_system} section="braking" field="abs_ebs_system" />
            </div>
          </CardContent>
        </Card>

        {/* Electrical System */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white">
            <CardTitle className="flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Electrical System
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Battery Count" value={displayTruck.electrical?.battery_count} section="electrical" field="battery_count" type="number" />
              <InfoRow label="Battery Voltage" value={displayTruck.electrical?.battery_voltage} section="electrical" field="battery_voltage" />
              <InfoRow label="Battery Type" value={displayTruck.electrical?.battery_type} section="electrical" field="battery_type" />
              <InfoRow label="Alternator Output" value={displayTruck.electrical?.alternator_output} section="electrical" field="alternator_output" />
              <InfoRow label="Alternator Manufacturer" value={displayTruck.electrical?.alternator_manufacturer} section="electrical" field="alternator_manufacturer" />
              <InfoRow label="Starter Type" value={displayTruck.electrical?.starter_type} section="electrical" field="starter_type" />
            </div>
          </CardContent>
        </Card>

        {/* Fuel System */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-500 text-white">
            <CardTitle className="flex items-center">
              <Droplet className="mr-2 h-5 w-5" />
              Fuel System
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Tank Capacity" value={displayTruck.fuel_system?.fuel_tank_capacity} section="fuel_system" field="fuel_tank_capacity" />
              <InfoRow label="Tank Count" value={displayTruck.fuel_system?.fuel_tank_count} section="fuel_system" field="fuel_tank_count" type="number" />
              <InfoRow label="Pump Type" value={displayTruck.fuel_system?.fuel_pump_type} section="fuel_system" field="fuel_pump_type" />
              <InfoRow label="Injector Type" value={displayTruck.fuel_system?.fuel_injector_type} section="fuel_system" field="fuel_injector_type" />
              <InfoRow label="Filter Type" value={displayTruck.fuel_system?.fuel_filter_type} section="fuel_system" field="fuel_filter_type" />
            </div>
          </CardContent>
        </Card>

        {/* Cooling System */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white">
            <CardTitle className="flex items-center">
              <Thermometer className="mr-2 h-5 w-5" />
              Cooling System
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Radiator Type" value={displayTruck.cooling?.radiator_type} section="cooling" field="radiator_type" />
              <InfoRow label="Coolant Type" value={displayTruck.cooling?.coolant_type} section="cooling" field="coolant_type" />
              <InfoRow label="Fan Type" value={displayTruck.cooling?.fan_type} section="cooling" field="fan_type" />
              <InfoRow label="Thermostat Temp" value={displayTruck.cooling?.thermostat_temp} section="cooling" field="thermostat_temp" />
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Information */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-500 text-white">
            <CardTitle className="flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Maintenance Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Current Mileage" value={displayTruck.maintenance?.current_mileage} section="maintenance" field="current_mileage" type="number" />
              <InfoRow label="In Service Date" value={displayTruck.maintenance?.in_service_date} section="maintenance" field="in_service_date" type="date" />
              <InfoRow label="Last Service" value={displayTruck.maintenance?.last_service_date} section="maintenance" field="last_service_date" type="date" />
              <InfoRow label="Last Oil Change" value={displayTruck.maintenance?.last_oil_change_date} section="maintenance" field="last_oil_change_date" type="date" />
              <InfoRow label="Oil Change Mileage" value={displayTruck.maintenance?.last_oil_change_mileage} section="maintenance" field="last_oil_change_mileage" type="number" />
              <InfoRow label="Last DPF Regen" value={displayTruck.maintenance?.last_dpf_regen_date} section="maintenance" field="last_dpf_regen_date" type="date" />
              <InfoRow label="Last DPF Cleaning" value={displayTruck.maintenance?.last_dpf_cleaning_date} section="maintenance" field="last_dpf_cleaning_date" type="date" />
              <InfoRow label="DPF Cleaning Mileage" value={displayTruck.maintenance?.last_dpf_cleaning_mileage} section="maintenance" field="last_dpf_cleaning_mileage" type="number" />
              <InfoRow label="Tire Size (Front)" value={displayTruck.maintenance?.tire_size_front} section="maintenance" field="tire_size_front" />
              <InfoRow label="Tire Size (Rear)" value={displayTruck.maintenance?.tire_size_rear} section="maintenance" field="tire_size_rear" />
              <InfoRow label="Last Tire Rotation" value={displayTruck.maintenance?.last_tire_rotation_date} section="maintenance" field="last_tire_rotation_date" type="date" />
              <InfoRow label="PM Schedule Interval" value={displayTruck.maintenance?.pm_schedule_interval} section="maintenance" field="pm_schedule_interval" type="number" />
              <InfoRow label="Next PM Due Mileage" value={displayTruck.maintenance?.next_pm_due_mileage} section="maintenance" field="next_pm_due_mileage" type="number" />
            </div>
          </CardContent>
        </Card>

        {/* Customer & Notes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <InfoRow label="Customer Name" value={displayTruck.customer_name} field="customer_name" fullWidth={true} />
              <InfoRow label="Customer ID" value={displayTruck.customer_id} field="customer_id" fullWidth={true} />
              <TextAreaRow label="General Notes" value={displayTruck.notes} field="notes" />
              <TextAreaRow label="Shop Notes" value={displayTruck.shop_notes} field="shop_notes" />
            </div>
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <TruckActivityTimeline truckId={id} />
      </div>
    </div>
    </TruckDetailEditContext.Provider>
  );
};

export default TruckDetail;
