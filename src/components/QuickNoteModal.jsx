// QuickNoteModal - React 19 compatible
import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { StickyNote, Truck, Camera, Mic, CalendarIcon, X, Loader2, MicOff, Plus, ArrowLeft, Check, ChevronsUpDown, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getCleanFetch } from '@/lib/cleanFetch';
import { truckAPI } from '@/services/truckService';
import { customerAPI } from '@/services/customerService';

const QuickNoteModal = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [trucks, setTrucks] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [selectedTruck, setSelectedTruck] = React.useState('');
  const [noteText, setNoteText] = React.useState('');
  const [reminderDate, setReminderDate] = React.useState(null);
  const [photoFile, setPhotoFile] = React.useState(null);
  const [photoPreview, setPhotoPreview] = React.useState(null);
  const [audioFile, setAudioFile] = React.useState(null);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const mediaRecorderRef = React.useRef(null);
  const audioChunksRef = React.useRef([]);
  const timerRef = React.useRef(null);
  const photoInputRef = React.useRef(null);

  // Create truck mode states
  const [isCreateTruckMode, setIsCreateTruckMode] = React.useState(false);
  const [newTruckVin, setNewTruckVin] = React.useState('');
  const [newTruckUnitNo, setNewTruckUnitNo] = React.useState('');
  const [newTruckCustomerName, setNewTruckCustomerName] = React.useState('');
  const [selectedCustomerId, setSelectedCustomerId] = React.useState(null);
  const [creatingTruck, setCreatingTruck] = React.useState(false);
  const [newlyCreatedTruck, setNewlyCreatedTruck] = React.useState(null);

  // Truck search state
  const [truckSearchOpen, setTruckSearchOpen] = React.useState(false);
  const [truckSearchQuery, setTruckSearchQuery] = React.useState('');

  // Customer search state for create truck form
  const [customers, setCustomers] = React.useState([]);
  const [customerSearchOpen, setCustomerSearchOpen] = React.useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = React.useState('');
  const [loadingCustomers, setLoadingCustomers] = React.useState(false);

  // Reminder calendar state
  const [reminderCalendarOpen, setReminderCalendarOpen] = React.useState(false);

  // Get display name for a truck
  const getTruckDisplayName = (truck) => {
    const unit = truck.identity?.unit_id || truck.identity?.truck_number || truck.unit_id || truck.truck_number;
    const vin = truck.identity?.vin || truck.vin;
    const year = truck.identity?.year || truck.year;
    const make = truck.identity?.make || truck.make;
    const model = truck.identity?.model || truck.model;
    
    let displayName = unit || vin || 'Unknown';
    if (year && make) {
      displayName += ` - ${year} ${make}`;
      if (model) displayName += ` ${model}`;
    }
    return displayName;
  };

  // Filter trucks based on search query
  const filteredTrucks = React.useMemo(() => {
    if (!truckSearchQuery) return trucks;
    const query = truckSearchQuery.toLowerCase();
    return trucks.filter(truck => {
      const displayName = getTruckDisplayName(truck).toLowerCase();
      const vin = (truck.identity?.vin || truck.vin || '').toLowerCase();
      const unit = (truck.identity?.unit_id || truck.identity?.truck_number || truck.unit_id || truck.truck_number || '').toLowerCase();
      const make = (truck.identity?.make || truck.make || '').toLowerCase();
      const model = (truck.identity?.model || truck.model || '').toLowerCase();
      const customerName = (truck.customer_name || '').toLowerCase();
      
      return displayName.includes(query) || 
             vin.includes(query) || 
             unit.includes(query) || 
             make.includes(query) || 
             model.includes(query) ||
             customerName.includes(query);
    });
  }, [trucks, truckSearchQuery]);

  // Get selected truck object
  const selectedTruckObj = React.useMemo(() => {
    return trucks.find(t => t.id === selectedTruck);
  }, [trucks, selectedTruck]);

  // Fetch trucks and customers when modal opens
  React.useEffect(() => {
    if (isOpen) {
      fetchTrucks();
      fetchCustomers();
    }
  }, [isOpen]);

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const { data } = await customerAPI.list();
      setCustomers(data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Filter customers based on search query
  const filteredCustomers = React.useMemo(() => {
    if (!customerSearchQuery) return customers;
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    );
  }, [customers, customerSearchQuery]);

  // Cleanup on close
  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const fetchTrucks = async () => {
    setLoading(true);
    try {
      const { data } = await truckAPI.list();
      setTrucks(data || []);
    } catch (error) {
      console.error('Failed to fetch trucks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load trucks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTruck('');
    setNoteText('');
    setReminderDate(null);
    setPhotoFile(null);
    setPhotoPreview(null);
    setAudioFile(null);
    stopRecording();
    setIsCreateTruckMode(false);
    setNewTruckVin('');
    setNewTruckUnitNo('');
    setNewTruckCustomerName('');
    setSelectedCustomerId(null);
    setNewlyCreatedTruck(null);
    setTruckSearchQuery('');
    setTruckSearchOpen(false);
    setCustomerSearchQuery('');
    setCustomerSearchOpen(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioFile(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const removeAudio = () => {
    setAudioFile(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const uploadFile = async (file, folder) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = file.name?.split('.').pop() || (file.type.includes('audio') ? 'webm' : 'jpg');
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error } = await supabase.storage
      .from('knowledge-files')
      .upload(filePath, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('knowledge-files')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  // Handle creating a new truck
  const handleCreateTruck = async () => {
    // Validate VIN or Unit No
    if (!newTruckVin && !newTruckUnitNo) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a VIN or Unit Number',
        variant: 'destructive',
      });
      return;
    }

    // VIN validation (if provided)
    if (newTruckVin && newTruckVin.length !== 17) {
      toast({
        title: 'Invalid VIN',
        description: 'VIN must be exactly 17 characters',
        variant: 'destructive',
      });
      return;
    }

    setCreatingTruck(true);
    try {
      // Get user's company_id first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const companyId = profile?.company_id;
      if (!companyId) throw new Error('No company found for user');

      let customerId = selectedCustomerId;
      let customerName = newTruckCustomerName.trim();

      // If a customer was selected from the dropdown, use that
      if (selectedCustomerId) {
        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
        if (selectedCustomer) {
          customerName = selectedCustomer.name;
        }
      } else if (customerName) {
        // If customer name was typed but not selected, create a new customer
        const customerResult = await customerAPI.create({
          name: customerName,
        });
        customerId = customerResult.data.id;
        // Add to customers list for future use
        setCustomers(prev => [...prev, customerResult.data]);
      }

      // Generate a temporary VIN if only unit number is provided
      // Use a 17-character format: "TEMPUNIT" + padded unit number
      let effectiveVin = newTruckVin;
      if (!effectiveVin && newTruckUnitNo) {
        // Create a 17-char temp VIN: TEMP + timestamp (13 chars)
        effectiveVin = `TEMP${Date.now()}`.substring(0, 17).padEnd(17, '0');
      }

      // Insert truck directly to database to bypass truckAPI validation
      const insertData = {
        company_id: companyId,
        customer_id: customerId,
        customer_name: customerName || null,
        vin: effectiveVin.toUpperCase(),
        unit_id: newTruckUnitNo || null,
        truck_number: newTruckUnitNo || null,
      };

      const { data: createdTruck, error: insertError } = await supabase
        .from('trucks')
        .insert(insertData)
        .select()
        .single();
      
      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('A truck with this VIN already exists');
        }
        throw insertError;
      }

      // Transform to match the expected format for UI
      const transformedTruck = {
        id: createdTruck.id,
        company_id: createdTruck.company_id,
        customer_id: createdTruck.customer_id,
        customer_name: customerName,
        identity: {
          vin: createdTruck.vin,
          unit_id: createdTruck.unit_id,
          truck_number: createdTruck.truck_number,
          year: createdTruck.year,
          make: createdTruck.make,
          model: createdTruck.model,
        },
        vin: createdTruck.vin,
        unit_id: createdTruck.unit_id,
        truck_number: createdTruck.truck_number,
        created_at: createdTruck.created_at,
        updated_at: createdTruck.updated_at,
      };

      // Store the newly created truck
      setNewlyCreatedTruck(transformedTruck);
      setSelectedTruck(transformedTruck.id);
      
      // Add to trucks list
      setTrucks(prev => [...prev, transformedTruck]);
      
      // Clear create truck fields but keep modal open for adding note
      setNewTruckVin('');
      setNewTruckUnitNo('');
      setNewTruckCustomerName('');
      setSelectedCustomerId(null);
      setCustomerSearchQuery('');
      
      // Exit create mode - truck is selected, user can now add note
      setIsCreateTruckMode(false);

      const successMessage = customerName 
        ? `Truck ${newTruckUnitNo || newTruckVin} created and linked to customer "${customerName}". Now add your note.`
        : `Truck ${newTruckUnitNo || newTruckVin} created successfully. Now add your note.`;

      toast({
        title: 'Truck Created',
        description: successMessage,
      });

    } catch (error) {
      console.error('Failed to create truck:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create truck',
        variant: 'destructive',
      });
    } finally {
      setCreatingTruck(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTruck) {
      toast({
        title: 'Validation Error',
        description: 'Please select a truck',
        variant: 'destructive',
      });
      return;
    }

    if (!noteText && !photoFile && !audioFile) {
      toast({
        title: 'Validation Error',
        description: 'Please add a note, photo, or voice recording',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      let mediaUrl = null;
      let photoUrl = null;
      let noteType = 'text';

      // Upload photo if present
      if (photoFile) {
        photoUrl = await uploadFile(photoFile, 'truck-notes-photos');
        noteType = 'photo';
      }

      // Upload audio if present (takes precedence for note_type)
      if (audioFile) {
        mediaUrl = await uploadFile(audioFile, 'truck-notes-audio');
        noteType = 'voice';
      }

      // If we have both photo and audio, set noteType to voice but keep photo_url
      if (photoFile && audioFile) {
        noteType = 'voice';
      }

      // If only text, keep noteType as 'text'
      if (noteText && !photoFile && !audioFile) {
        noteType = 'text';
      }

      // If only photo (no audio), media_url should be the photo
      if (photoFile && !audioFile) {
        mediaUrl = photoUrl;
        photoUrl = null; // Don't need separate photo_url if it's the main media
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Call the edge function
      const cleanFetch = getCleanFetch();
      const response = await cleanFetch(
        `https://jdiowphmzsqvpizlwlzn.supabase.co/functions/v1/truck-notes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            truck_id: selectedTruck,
            note_type: noteType,
            note_text: noteText || null,
            media_url: mediaUrl,
            photo_url: photoUrl,
            reminder_at: reminderDate ? reminderDate.toISOString() : null,
            source: 'manual',
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create note');
      }

      toast({
        title: 'Note Added',
        description: newlyCreatedTruck 
          ? `Note attached to newly created truck ${newTruckUnitNo || newTruckVin}`
          : 'Your quick note has been saved successfully.',
      });

      onClose();
    } catch (error) {
      console.error('Failed to create note:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save note',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Render create truck form
  const renderCreateTruckForm = () => (
    <div className="space-y-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCreateTruckMode(false)}
          className="p-1"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">Create New Truck</span>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
        <p className="text-sm text-orange-800">
          Enter a VIN or Unit Number to create a new truck. The note you add will be automatically attached to this truck.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newVin">VIN Number</Label>
        <Input
          id="newVin"
          placeholder="Enter 17-character VIN..."
          value={newTruckVin}
          onChange={(e) => setNewTruckVin(e.target.value.toUpperCase())}
          maxLength={17}
          className="font-mono"
        />
        {newTruckVin && newTruckVin.length !== 17 && (
          <p className="text-xs text-muted-foreground">
            VIN must be 17 characters ({newTruckVin.length}/17)
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className="h-px flex-1 bg-border" />
        <span>OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newUnitNo">Unit Number</Label>
        <Input
          id="newUnitNo"
          placeholder="Enter Unit/Truck Number..."
          value={newTruckUnitNo}
          onChange={(e) => setNewTruckUnitNo(e.target.value)}
        />
      </div>

      {/* Customer Section with Search Dropdown */}
      <div className="pt-2 border-t border-border">
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            Customer <span className="text-xs text-muted-foreground">(Optional)</span>
          </Label>
          <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={customerSearchOpen}
                className="w-full justify-between font-normal"
                disabled={loadingCustomers}
              >
                {loadingCustomers ? (
                  <span className="text-muted-foreground">Loading customers...</span>
                ) : selectedCustomerId ? (
                  <span className="truncate">
                    {customers.find(c => c.id === selectedCustomerId)?.name || 'Select customer...'}
                  </span>
                ) : newTruckCustomerName ? (
                  <span className="truncate text-green-600">
                    + Create: "{newTruckCustomerName}"
                  </span>
                ) : (
                  <span className="text-muted-foreground">Search or create customer...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search customers or type new name..."
                  value={customerSearchQuery}
                  onValueChange={(value) => {
                    setCustomerSearchQuery(value);
                    // If typing a new name, clear selection and set as new customer name
                    if (value && !customers.some(c => c.name.toLowerCase() === value.toLowerCase())) {
                      setSelectedCustomerId(null);
                      setNewTruckCustomerName(value);
                    }
                  }}
                />
                <CommandList>
                  <CommandEmpty>
                    {customerSearchQuery ? (
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-green-600 hover:text-green-700"
                          onClick={() => {
                            setNewTruckCustomerName(customerSearchQuery);
                            setSelectedCustomerId(null);
                            setCustomerSearchOpen(false);
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create "{customerSearchQuery}"
                        </Button>
                      </div>
                    ) : (
                      <p className="p-2 text-sm text-muted-foreground">No customers found</p>
                    )}
                  </CommandEmpty>
                  <CommandGroup heading="Existing Customers">
                    {filteredCustomers.slice(0, 10).map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.id}
                        onSelect={() => {
                          setSelectedCustomerId(customer.id);
                          setNewTruckCustomerName(customer.name);
                          setCustomerSearchQuery('');
                          setCustomerSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.name}</span>
                          {(customer.email || customer.phone) && (
                            <span className="text-xs text-muted-foreground">
                              {customer.email || customer.phone}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {customerSearchQuery && !customers.some(c => c.name.toLowerCase() === customerSearchQuery.toLowerCase()) && (
                    <CommandGroup heading="Create New">
                      <CommandItem
                        value={`create-${customerSearchQuery}`}
                        onSelect={() => {
                          setNewTruckCustomerName(customerSearchQuery);
                          setSelectedCustomerId(null);
                          setCustomerSearchOpen(false);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4 text-green-600" />
                        <span className="text-green-600">Create "{customerSearchQuery}"</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedCustomerId && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Truck will be linked to existing customer</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setSelectedCustomerId(null);
                  setNewTruckCustomerName('');
                  setCustomerSearchQuery('');
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
          {!selectedCustomerId && newTruckCustomerName && (
            <div className="flex items-center justify-between text-xs text-green-600">
              <span>New customer will be created</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => {
                  setNewTruckCustomerName('');
                  setCustomerSearchQuery('');
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button 
          variant="outline" 
          onClick={() => setIsCreateTruckMode(false)} 
          disabled={creatingTruck}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleCreateTruck} 
          disabled={creatingTruck || (!newTruckVin && !newTruckUnitNo)}
          className="bg-green-600 hover:bg-green-700"
        >
          {creatingTruck ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Create Truck
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // Render main note form
  const renderNoteForm = () => (
    <div className="space-y-4 py-4">
      {/* Truck Selector with Search and Create Button */}
      <div className="space-y-2">
        <Label htmlFor="truck" className="flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Select Truck <span className="text-red-500">*</span>
        </Label>
        <div className="flex gap-2">
          <Popover open={truckSearchOpen} onOpenChange={setTruckSearchOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={truckSearchOpen}
                className="flex-1 justify-between font-normal"
                disabled={loading}
              >
                {loading ? (
                  <span className="text-muted-foreground">Loading trucks...</span>
                ) : selectedTruckObj ? (
                  <span className="truncate">
                    {getTruckDisplayName(selectedTruckObj)}
                    {newlyCreatedTruck?.id === selectedTruckObj.id && ' (New)'}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Search or choose a truck...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-background border shadow-lg z-50" align="start">
              <Command shouldFilter={false}>
                <div className="flex items-center border-b px-3">
                  <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <input
                    placeholder="Search by VIN, Unit No, Make, Model..."
                    value={truckSearchQuery}
                    onChange={(e) => setTruckSearchQuery(e.target.value)}
                    className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {truckSearchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setTruckSearchQuery('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <CommandList className="max-h-[300px] overflow-y-auto">
                  {filteredTrucks.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No trucks found.
                    </div>
                  ) : (
                    <CommandGroup>
                      {filteredTrucks.map((truck) => (
                        <CommandItem
                          key={truck.id}
                          value={truck.id}
                          onSelect={() => {
                            setSelectedTruck(truck.id);
                            setTruckSearchOpen(false);
                            setTruckSearchQuery('');
                          }}
                          className="cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedTruck === truck.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {getTruckDisplayName(truck)}
                              {newlyCreatedTruck?.id === truck.id && (
                                <span className="ml-2 text-xs text-green-600">(New)</span>
                              )}
                            </div>
                            {truck.customer_name && (
                              <div className="text-xs text-muted-foreground truncate">
                                Customer: {truck.customer_name}
                              </div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreateTruckMode(true)}
            className="flex items-center gap-1 text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Create Truck
          </Button>
        </div>
        {newlyCreatedTruck && selectedTruck === newlyCreatedTruck.id && (
          <p className="text-xs text-green-600 flex items-center gap-1">
            <Truck className="h-3 w-3" />
            Note will be attached to newly created truck
          </p>
        )}
      </div>

      {/* Note Text */}
      <div className="space-y-2">
        <Label htmlFor="noteText">Note</Label>
        <Textarea
          id="noteText"
          className="w-full resize-vertical"
          placeholder="Enter your note here..."
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          rows={3}
        />
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Photo
        </Label>
        {photoPreview ? (
          <div className="relative inline-block">
            <img src={photoPreview} alt="Preview" className="max-h-32 rounded-lg border" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={removePhoto}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="cursor-pointer"
          />
        )}
      </div>

      {/* Voice Recording */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Mic className="h-4 w-4" />
          Voice Note
        </Label>
        <div className="flex items-center gap-2">
          {!audioFile ? (
            <>
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                onClick={isRecording ? stopRecording : startRecording}
                className="flex items-center gap-2"
              >
                {isRecording ? (
                  <>
                    <MicOff className="h-4 w-4" />
                    Stop ({formatTime(recordingTime)})
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4" />
                    Record
                  </>
                )}
              </Button>
              {isRecording && (
                <span className="text-sm text-muted-foreground animate-pulse">
                  Recording...
                </span>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-600 flex items-center gap-1">
                <Mic className="h-4 w-4" />
                Voice note recorded ({formatTime(recordingTime)})
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={removeAudio}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Reminder Date */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          Reminder (Optional)
        </Label>
        <Popover open={reminderCalendarOpen} onOpenChange={setReminderCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !reminderDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {reminderDate ? format(reminderDate, "PPP") : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0 z-50 bg-background" align="start">
            <Calendar
              mode="single"
              selected={reminderDate}
              onSelect={(date) => {
                setReminderDate(date);
                setReminderCalendarOpen(false);
              }}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return date < today;
              }}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        {reminderDate && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setReminderDate(null)}
            className="text-xs"
          >
            Clear reminder
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-orange-500" />
            Quick Note
          </DialogTitle>
        </DialogHeader>

        {isCreateTruckMode ? renderCreateTruckForm() : renderNoteForm()}

        {/* Actions - only show on main form */}
        {!isCreateTruckMode && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || !selectedTruck}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <StickyNote className="mr-2 h-4 w-4" />
                  Save Note
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QuickNoteModal;
