import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { truckAPI } from '../lib/api';
import { usePermissions } from '../hooks/usePermissions';
import { supabase } from '../integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { 
  ArrowLeft, Edit, Truck as TruckIcon, Wrench, Save, X,
  Gauge, Cog, Droplet,
  Loader2, Trash2, FileText, AlertTriangle,
  Package, ArrowUpFromLine, Power, Snowflake
} from 'lucide-react';
import { toast } from 'sonner';
import TruckIntelligenceTimeline from '../components/TruckIntelligenceTimeline';
import TruckAIChat from '../components/TruckAIChat';

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
  const { hasPermission, isMasterAdmin, isAdmin } = usePermissions();
  const [truck, setTruck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTruck, setEditedTruck] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relatedRecords, setRelatedRecords] = useState({ workOrders: [], maintenanceRecords: [], loading: true });
  
  // Only master_admin and company_admin can delete trucks
  const canDeleteTruck = hasPermission('trucks', 'delete');

  // Fetch related records when delete dialog opens
  const fetchRelatedRecords = async () => {
    setRelatedRecords(prev => ({ ...prev, loading: true }));
    try {
      const [workOrdersRes, maintenanceRes] = await Promise.all([
        supabase.from('work_orders').select('id, work_order_number, complaint, status, created_at').eq('truck_id', id).limit(10),
        supabase.from('maintenance_records').select('id, service_type, service_category, service_date, description').eq('truck_id', id).limit(10)
      ]);
      
      setRelatedRecords({
        workOrders: workOrdersRes.data || [],
        maintenanceRecords: maintenanceRes.data || [],
        loading: false
      });
    } catch (error) {
      console.error('Error fetching related records:', error);
      setRelatedRecords({ workOrders: [], maintenanceRecords: [], loading: false });
    }
  };

  const handleDeleteDialogOpen = (open) => {
    setDeleteDialogOpen(open);
    if (open) {
      fetchRelatedRecords();
    }
  };

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

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await truckAPI.delete(id);
      toast.success('Truck deleted successfully');
      navigate('/trucks');
    } catch (error) {
      console.error('Error deleting truck:', error);
      setError(error.response?.data?.detail || 'Failed to delete truck');
      toast.error('Failed to delete truck');
    } finally {
      setDeleting(false);
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
                <>
                  <Button onClick={handleEdit} className="bg-[#124481] hover:bg-[#1E7083]">
                    <Edit className="mr-2 h-4 w-4" /> Edit Truck
                  </Button>
                  
                  {/* Delete button - only visible to master_admin and company_admin */}
                  {canDeleteTruck && (
                    <AlertDialog open={deleteDialogOpen} onOpenChange={handleDeleteDialogOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={deleting}>
                          {deleting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete Fleet
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-5 w-5" />
                            Delete this truck?
                          </AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-4">
                              <p>
                                This action cannot be undone. This will permanently delete the truck 
                                <span className="font-semibold text-foreground"> {displayTruck.identity?.truck_number || displayTruck.identity?.vin || 'this vehicle'}</span>.
                              </p>
                              
                              {/* Related Records Section */}
                              {relatedRecords.loading ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                  <span className="ml-2 text-sm text-muted-foreground">Checking related records...</span>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {/* Work Orders */}
                                  {relatedRecords.workOrders.length > 0 && (
                                    <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-4 w-4 text-amber-600" />
                                        <span className="font-medium text-amber-800">
                                          {relatedRecords.workOrders.length} Work Order{relatedRecords.workOrders.length !== 1 ? 's' : ''} will be affected
                                        </span>
                                      </div>
                                      <ScrollArea className="max-h-24">
                                        <ul className="text-xs text-amber-700 space-y-1">
                                          {relatedRecords.workOrders.map(wo => (
                                            <li key={wo.id} className="flex justify-between">
                                              <span>{wo.work_order_number || 'No RO#'}</span>
                                              <Badge variant="outline" className="text-xs h-5">
                                                {wo.status || 'unknown'}
                                              </Badge>
                                            </li>
                                          ))}
                                        </ul>
                                      </ScrollArea>
                                    </div>
                                  )}
                                  
                                  {/* Maintenance Records */}
                                  {relatedRecords.maintenanceRecords.length > 0 && (
                                    <div className="border rounded-lg p-3 bg-blue-50 border-blue-200">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Wrench className="h-4 w-4 text-blue-600" />
                                        <span className="font-medium text-blue-800">
                                          {relatedRecords.maintenanceRecords.length} Maintenance Record{relatedRecords.maintenanceRecords.length !== 1 ? 's' : ''} will be deleted
                                        </span>
                                      </div>
                                      <ScrollArea className="max-h-24">
                                        <ul className="text-xs text-blue-700 space-y-1">
                                          {relatedRecords.maintenanceRecords.map(mr => (
                                            <li key={mr.id} className="flex justify-between">
                                              <span>{mr.service_type || mr.service_category || 'Service'}</span>
                                              <span className="text-muted-foreground">
                                                {mr.service_date ? new Date(mr.service_date).toLocaleDateString() : '-'}
                                              </span>
                                            </li>
                                          ))}
                                        </ul>
                                      </ScrollArea>
                                    </div>
                                  )}
                                  
                                  {/* No related records */}
                                  {relatedRecords.workOrders.length === 0 && relatedRecords.maintenanceRecords.length === 0 && (
                                    <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                                      <p className="text-sm text-green-700">
                                        ✓ No related work orders or maintenance records found.
                                      </p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={relatedRecords.loading}
                          >
                            Delete Permanently
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </>
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
              <InfoRow label="VIN" value={displayTruck.identity?.vin} section="identity" field="vin" />
              <InfoRow label="Year" value={displayTruck.identity?.year} section="identity" field="year" type="number" />
              <InfoRow label="Make" value={displayTruck.identity?.make} section="identity" field="make" />
              <InfoRow label="Model" value={displayTruck.identity?.model} section="identity" field="model" />
              <InfoRow label="Truck Number" value={displayTruck.identity?.truck_number} section="identity" field="truck_number" />
              <InfoRow label="License Plate" value={displayTruck.identity?.license_plate} section="identity" field="license_plate" />
              <InfoRow label="Fleet Assignment" value={displayTruck.identity?.fleet_assignment} section="identity" field="fleet_assignment" />
              <InfoRow label="Odometer (mi)" value={displayTruck.identity?.odometer_mi} section="identity" field="odometer_mi" type="number" />
              <InfoRow label="Engine Hours" value={displayTruck.identity?.engine_hours} section="identity" field="engine_hours" type="number" />
              <InfoRow label="Vehicle Class" value={displayTruck.identity?.vehicle_class} section="identity" field="vehicle_class" />
              <InfoRow label="Body Type" value={displayTruck.identity?.body_type} section="identity" field="body_type" />
              <InfoRow label="In Service Date" value={displayTruck.in_service_date} field="in_service_date" type="date" />
            </div>
          </CardContent>
        </Card>

        {/* Truck AI Assistant */}
        <TruckAIChat truckId={id} truck={displayTruck} />

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
              <InfoRow label="Key Code" value={displayTruck.engine?.key_code} section="engine" field="key_code" />
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
              <InfoRow label="Front Axle Model" value={displayTruck.drivetrain?.front_axle_model} section="drivetrain" field="front_axle_model" />
              <InfoRow label="Front Axle Serial" value={displayTruck.drivetrain?.front_axle_serial} section="drivetrain" field="front_axle_serial" />
              <InfoRow label="5th Wheel Model" value={displayTruck.drivetrain?.fifth_wheel_model} section="drivetrain" field="fifth_wheel_model" />
              <InfoRow label="5th Wheel Serial" value={displayTruck.drivetrain?.fifth_wheel_serial} section="drivetrain" field="fifth_wheel_serial" />
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
              <InfoRow label="Air Dryer" value={displayTruck.braking?.air_drier || displayTruck.braking?.air_dryer_model} section="braking" field="air_drier" />
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
              <InfoRow label="Tank Size" value={displayTruck.fuel_system?.tank_size || displayTruck.fuel_system?.fuel_tank_capacity} section="fuel_system" field="tank_size" />
            </div>
          </CardContent>
        </Card>


        {/* Body & Equipment */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-slate-600 to-slate-500 text-white">
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Body & Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Body Manufacturer" value={displayTruck.maintenance?.body?.manufacturer} section="maintenance" field="body.manufacturer" />
              <InfoRow label="Body Model" value={displayTruck.maintenance?.body?.model} section="maintenance" field="body.model" />
              <InfoRow label="Body Serial #" value={displayTruck.maintenance?.body?.serial_number} section="maintenance" field="body.serial_number" />
              <InfoRow label="Body Length" value={displayTruck.maintenance?.body?.length} section="maintenance" field="body.length" />
              <InfoRow label="Rear Door Type" value={displayTruck.maintenance?.body?.rear_door_type} section="maintenance" field="body.rear_door_type" />
              <InfoRow label="Vehicle Height" value={displayTruck.maintenance?.vehicle_height} section="maintenance" field="vehicle_height" />
              <InfoRow label="Equipment Pool" value={displayTruck.maintenance?.equipment_pool} section="maintenance" field="equipment_pool" />
              <InfoRow label="Location Code" value={displayTruck.maintenance?.location_code} section="maintenance" field="location_code" />
              <InfoRow label="Location" value={displayTruck.maintenance?.location_description} section="maintenance" field="location_description" />
              <InfoRow label="Customer Unit #" value={displayTruck.maintenance?.customer_unit_number} section="maintenance" field="customer_unit_number" />
            </div>
          </CardContent>
        </Card>

        {/* Liftgate */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white">
            <CardTitle className="flex items-center">
              <ArrowUpFromLine className="mr-2 h-5 w-5" />
              Liftgate
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Manufacturer" value={displayTruck.maintenance?.liftgate?.manufacturer} section="maintenance" field="liftgate.manufacturer" />
              <InfoRow label="Model" value={displayTruck.maintenance?.liftgate?.model} section="maintenance" field="liftgate.model" />
              <InfoRow label="Serial Number" value={displayTruck.maintenance?.liftgate?.serial_number} section="maintenance" field="liftgate.serial_number" />
            </div>
          </CardContent>
        </Card>

        {/* APU */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-emerald-600 to-emerald-500 text-white">
            <CardTitle className="flex items-center">
              <Power className="mr-2 h-5 w-5" />
              Auxiliary Power Unit (APU)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Manufacturer" value={displayTruck.maintenance?.apu?.manufacturer} section="maintenance" field="apu.manufacturer" />
              <InfoRow label="Model" value={displayTruck.maintenance?.apu?.model} section="maintenance" field="apu.model" />
              <InfoRow label="Serial Number" value={displayTruck.maintenance?.apu?.serial_number} section="maintenance" field="apu.serial_number" />
            </div>
          </CardContent>
        </Card>

        {/* Reefer */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-sky-600 to-sky-500 text-white">
            <CardTitle className="flex items-center">
              <Snowflake className="mr-2 h-5 w-5" />
              Reefer Unit
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoRow label="Manufacturer" value={displayTruck.maintenance?.reefer?.manufacturer} section="maintenance" field="reefer.manufacturer" />
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
              <TextAreaRow label="General Notes" value={displayTruck.notes} field="notes" />
              <TextAreaRow label="Shop Notes" value={displayTruck.shop_notes} field="shop_notes" />
            </div>
          </CardContent>
        </Card>

        {/* Truck Intelligence Timeline */}
        <TruckIntelligenceTimeline truckId={id} />
      </div>
    </div>
    </TruckDetailEditContext.Provider>
  );
};

export default TruckDetail;
