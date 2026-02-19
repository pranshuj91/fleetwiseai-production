import React, { useState, useEffect, useRef } from 'react';
import Navigation from '../components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { 
  Settings as SettingsIcon, Building, Bell, Database, Save, Check, Loader2,
  PenTool, Upload, Trash2, Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

const Settings = () => {
  const { user, profile } = useAuth();
  
  // Check if user can edit company information (only master_admin and company_admin)
  const canEditCompanyInfo = profile?.role === 'master_admin' || profile?.role === 'company_admin';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companySettings, setCompanySettings] = useState({
    companyName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    email: '',
    logoUrl: '',
    taxRate: '8.5',
    laborRate: '125',
    shopSuppliesFee: '25',
    environmentalFee: '15'
  });

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  const [notifications, setNotifications] = useState({
    emailWorkOrders: true,
    emailInvoices: true,
    emailPM: true,
    emailWarranty: false,
    smsAlerts: false
  });

  // Signature state
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const signatureInputRef = useRef(null);

  // Load company data and signature on mount
  useEffect(() => {
    const fetchCompanySettings = async () => {
      if (!profile?.company_id) {
        setLoading(false);
        return;
      }

      try {
        // Fetch company name (source of truth)
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .single();

        if (companyError) {
          console.error('Error fetching company:', companyError);
          toast.error('Failed to load company settings');
          return;
        }

        // Fetch business profile (logo, address, etc.)
        const { data: profileData } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('company_id', profile.company_id)
          .maybeSingle();

        // Use companies.name as the source of truth for company name
        const companyName = companyData?.name || '';
        
        setCompanySettings(prev => ({
          ...prev,
          companyName: companyName,
          logoUrl: profileData?.logo_url || '',
          address: profileData?.address_line_1 || '',
          city: profileData?.city || '',
          state: profileData?.state || '',
          zipCode: profileData?.postal_code || '',
          phone: profileData?.phone || '',
          email: profileData?.email || '',
        }));

        // Auto-sync business_profiles.display_name if it's different from companies.name
        if (profileData && profileData.display_name !== companyName && companyName) {
          await supabase
            .from('business_profiles')
            .update({ display_name: companyName, updated_at: new Date().toISOString() })
            .eq('company_id', profile.company_id);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanySettings();
  }, [profile?.company_id]);

  // Handle company logo upload
  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG, JPG, or WebP image');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    if (!profile?.company_id || !canEditCompanyInfo) {
      toast.error('You do not have permission to upload a logo');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.company_id}/logo.${fileExt}`;

      // Delete existing logo files
      await supabase.storage.from('signatures').remove([
        `${profile.company_id}/logo.png`,
        `${profile.company_id}/logo.jpg`,
        `${profile.company_id}/logo.jpeg`,
        `${profile.company_id}/logo.webp`
      ]);

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Upsert business profile with logo URL
      const { error: dbError } = await supabase
        .from('business_profiles')
        .upsert({
          company_id: profile.company_id,
          display_name: companySettings.companyName || 'Company',
          logo_url: publicUrl,
          address_line_1: companySettings.address,
          city: companySettings.city,
          state: companySettings.state,
          postal_code: companySettings.zipCode,
          phone: companySettings.phone,
          email: companySettings.email,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'company_id'
        });

      if (dbError) throw dbError;

      setCompanySettings(prev => ({ ...prev, logoUrl: publicUrl }));
      toast.success('Company logo uploaded successfully!');
    } catch (err) {
      console.error('Error uploading logo:', err);
      toast.error('Failed to upload logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  // Handle logo delete
  const handleDeleteLogo = async () => {
    if (!profile?.company_id || !canEditCompanyInfo) return;

    setUploadingLogo(true);
    try {
      await supabase.storage.from('signatures').remove([
        `${profile.company_id}/logo.png`,
        `${profile.company_id}/logo.jpg`,
        `${profile.company_id}/logo.jpeg`,
        `${profile.company_id}/logo.webp`
      ]);

      const { error: dbError } = await supabase
        .from('business_profiles')
        .update({ logo_url: null, updated_at: new Date().toISOString() })
        .eq('company_id', profile.company_id);

      if (dbError) throw dbError;

      setCompanySettings(prev => ({ ...prev, logoUrl: '' }));
      toast.success('Company logo removed');
    } catch (err) {
      console.error('Error deleting logo:', err);
      toast.error('Failed to delete logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  // Load user signature
  useEffect(() => {
    const fetchSignature = async () => {
      if (!user?.id) return;
      
      setSignatureLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_signatures')
          .select('signature_url')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching signature:', error);
          return;
        }

        if (data?.signature_url) {
          setSignatureUrl(data.signature_url);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setSignatureLoading(false);
      }
    };

    fetchSignature();
  }, [user?.id]);

  // Handle signature upload
  const handleSignatureUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a PNG or JPG image');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    if (!profile?.company_id || !user?.id) {
      toast.error('User session not found');
      return;
    }

    setUploadingSignature(true);
    try {
      // Create file path: company_id/user_id/signature.ext
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile.company_id}/${user.id}/signature.${fileExt}`;

      // Delete existing signature file if exists
      await supabase.storage.from('signatures').remove([filePath]);

      // Upload new signature
      const { error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Determine role based on user's role
      let signatureRole = 'technician';
      if (profile?.role === 'company_admin' || profile?.role === 'master_admin') {
        signatureRole = 'admin';
      } else if (profile?.role === 'shop_supervisor' || profile?.role === 'office_manager') {
        signatureRole = 'supervisor';
      }

      // Upsert signature record
      const { error: dbError } = await supabase
        .from('user_signatures')
        .upsert({
          user_id: user.id,
          company_id: profile.company_id,
          role: signatureRole,
          signature_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (dbError) throw dbError;

      setSignatureUrl(publicUrl);
      toast.success('Signature uploaded successfully!');
    } catch (err) {
      console.error('Error uploading signature:', err);
      toast.error('Failed to upload signature: ' + err.message);
    } finally {
      setUploadingSignature(false);
      if (signatureInputRef.current) {
        signatureInputRef.current.value = '';
      }
    }
  };

  // Handle signature delete
  const handleDeleteSignature = async () => {
    if (!profile?.company_id || !user?.id) return;

    setUploadingSignature(true);
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('signatures')
        .remove([`${profile.company_id}/${user.id}/signature.png`, `${profile.company_id}/${user.id}/signature.jpg`, `${profile.company_id}/${user.id}/signature.jpeg`]);

      if (storageError) console.warn('Storage delete warning:', storageError);

      // Delete from database
      const { error: dbError } = await supabase
        .from('user_signatures')
        .delete()
        .eq('user_id', user.id);

      if (dbError) throw dbError;

      setSignatureUrl(null);
      toast.success('Signature deleted');
    } catch (err) {
      console.error('Error deleting signature:', err);
      toast.error('Failed to delete signature');
    } finally {
      setUploadingSignature(false);
    }
  };

  const handleSave = async () => {
    if (!canEditCompanyInfo) {
      toast.error('You do not have permission to modify company settings');
      return;
    }
    
    if (!profile?.company_id) {
      toast.error('No company associated with your account');
      return;
    }

    setSaving(true);
    try {
      // Update company name in the companies table
      const { error: companyError } = await supabase
        .from('companies')
        .update({ name: companySettings.companyName })
        .eq('id', profile.company_id);

      if (companyError) {
        console.error('Error updating company:', companyError);
        toast.error('Failed to save settings: ' + companyError.message);
        return;
      }

      // Upsert business profile with all company information (for PDF branding)
      const { error: profileError } = await supabase
        .from('business_profiles')
        .upsert({
          company_id: profile.company_id,
          display_name: companySettings.companyName || 'Company',
          address_line_1: companySettings.address || '',
          city: companySettings.city || '',
          state: companySettings.state || '',
          postal_code: companySettings.zipCode || '',
          phone: companySettings.phone || '',
          email: companySettings.email || '',
          logo_url: companySettings.logoUrl || null,
        }, {
          onConflict: 'company_id'
        });

      if (profileError) {
        console.error('Error updating business profile:', profileError);
        // Don't fail completely - company was saved
        toast.warning('Company saved, but profile branding may not update');
      }

      setSaved(true);
      toast.success('Settings saved successfully!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error:', err);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="mr-3 h-8 w-8 text-[#124481]" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage your shop and system preferences</p>
        </div>

        {/* Save Button */}
        {saved && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
            <Check className="h-5 w-5" />
            Settings saved successfully!
          </div>
        )}

        {/* Company Information */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Building className="mr-2 h-5 w-5" />
                Company Information
              </span>
              {!canEditCompanyInfo && (
                <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                  View Only
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!canEditCompanyInfo && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                Only Company Admins and Super Admins can modify company information.
              </div>
            )}
            
            {/* Company Logo Section */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Company Logo
              </label>
              <div className="flex items-start gap-6">
                {/* Logo Preview */}
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
                  {companySettings.logoUrl ? (
                    <img 
                      src={companySettings.logoUrl} 
                      alt="Company logo" 
                      className="w-full h-full object-contain p-2"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImageIcon className="h-8 w-8 mx-auto mb-1" />
                      <span className="text-xs">No logo</span>
                    </div>
                  )}
                </div>
                
                {/* Upload Controls */}
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-3">
                    Upload your company logo. This will appear on RO Packets and other documents.
                  </p>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload"
                    disabled={!canEditCompanyInfo}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={companySettings.logoUrl ? "outline" : "default"}
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo || !canEditCompanyInfo}
                      className={!companySettings.logoUrl ? "bg-[#124481] hover:bg-[#1E7083]" : ""}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {companySettings.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                    </Button>
                    
                    {companySettings.logoUrl && canEditCompanyInfo && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteLogo}
                        disabled={uploadingLogo}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG, or WebP. Max 2MB.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <Input
                  value={companySettings.companyName}
                  onChange={(e) => setCompanySettings({...companySettings, companyName: e.target.value})}
                  disabled={!canEditCompanyInfo}
                  className={!canEditCompanyInfo ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  value={companySettings.phone}
                  onChange={(e) => setCompanySettings({...companySettings, phone: e.target.value})}
                  placeholder="(555) 123-4567"
                  disabled={!canEditCompanyInfo}
                  className={!canEditCompanyInfo ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <Input
                  value={companySettings.address}
                  onChange={(e) => setCompanySettings({...companySettings, address: e.target.value})}
                  placeholder="123 Fleet Street"
                  disabled={!canEditCompanyInfo}
                  className={!canEditCompanyInfo ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <Input
                  value={companySettings.city}
                  onChange={(e) => setCompanySettings({...companySettings, city: e.target.value})}
                  placeholder="San Francisco"
                  disabled={!canEditCompanyInfo}
                  className={!canEditCompanyInfo ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <Input
                  value={companySettings.state}
                  onChange={(e) => setCompanySettings({...companySettings, state: e.target.value})}
                  maxLength={2}
                  placeholder="CA"
                  disabled={!canEditCompanyInfo}
                  className={!canEditCompanyInfo ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ZIP Code
                </label>
                <Input
                  value={companySettings.zipCode}
                  onChange={(e) => setCompanySettings({...companySettings, zipCode: e.target.value})}
                  placeholder="94105"
                  disabled={!canEditCompanyInfo}
                  className={!canEditCompanyInfo ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={companySettings.email}
                  onChange={(e) => setCompanySettings({...companySettings, email: e.target.value})}
                  placeholder="contact@company.com"
                  disabled={!canEditCompanyInfo}
                  className={!canEditCompanyInfo ? "bg-gray-100 cursor-not-allowed" : ""}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My Signature */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#124481] to-[#1E7083] text-white">
            <CardTitle className="flex items-center">
              <PenTool className="mr-2 h-5 w-5" />
              My Signature
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-600 mb-4">
              Upload your digital signature for use on Repair Order (RO) packets. This signature will be automatically applied when you sign off on work orders.
            </p>
            
            {signatureLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Signature Preview */}
                {signatureUrl ? (
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Signature:</p>
                    <div className="bg-white border rounded-lg p-4 flex items-center justify-center min-h-[120px]">
                      <img 
                        src={signatureUrl} 
                        alt="Your signature" 
                        className="max-h-24 max-w-full object-contain"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="hidden text-gray-400 text-sm flex items-center gap-2">
                        <ImageIcon className="h-5 w-5" />
                        Failed to load signature
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-gray-600">No signature uploaded yet</p>
                    <p className="text-sm text-gray-500 mt-1">Upload a PNG or JPG image of your signature</p>
                  </div>
                )}

                {/* Upload/Replace Controls */}
                <div className="flex flex-wrap gap-3">
                  <input
                    ref={signatureInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    onChange={handleSignatureUpload}
                    className="hidden"
                    id="signature-upload"
                  />
                  <Button
                    variant={signatureUrl ? "outline" : "default"}
                    onClick={() => signatureInputRef.current?.click()}
                    disabled={uploadingSignature}
                    className={!signatureUrl ? "bg-[#124481] hover:bg-[#1E7083]" : ""}
                  >
                    {uploadingSignature ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {signatureUrl ? 'Replace Signature' : 'Upload Signature'}
                  </Button>
                  
                  {signatureUrl && (
                    <Button
                      variant="outline"
                      onClick={handleDeleteSignature}
                      disabled={uploadingSignature}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                  )}
                </div>

                <p className="text-xs text-gray-500">
                  Accepted formats: PNG, JPG • Maximum size: 2MB • For best results, use a transparent PNG
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#1E7083] to-[#289790] text-white">
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5" />
              Default Rates & Fees
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Labor Rate (per hour)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={companySettings.laborRate}
                    onChange={(e) => setCompanySettings({...companySettings, laborRate: e.target.value})}
                    className="pl-7"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tax Rate (%)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={companySettings.taxRate}
                    onChange={(e) => setCompanySettings({...companySettings, taxRate: e.target.value})}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Supplies Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={companySettings.shopSuppliesFee}
                    onChange={(e) => setCompanySettings({...companySettings, shopSuppliesFee: e.target.value})}
                    className="pl-7"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Environmental Fee
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={companySettings.environmentalFee}
                    onChange={(e) => setCompanySettings({...companySettings, environmentalFee: e.target.value})}
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card className="mb-6">
          <CardHeader className="bg-gradient-to-r from-[#289790] to-[#1E7083] text-white">
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications - Work Orders</p>
                  <p className="text-sm text-gray-600">Receive emails when work orders are created or updated</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailWorkOrders}
                  onChange={(e) => setNotifications({...notifications, emailWorkOrders: e.target.checked})}
                  className="w-5 h-5 text-[#124481]"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications - Invoices</p>
                  <p className="text-sm text-gray-600">Receive emails when invoices are sent or paid</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailInvoices}
                  onChange={(e) => setNotifications({...notifications, emailInvoices: e.target.checked})}
                  className="w-5 h-5 text-[#124481]"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications - PM Reminders</p>
                  <p className="text-sm text-gray-600">Get reminders for upcoming preventive maintenance</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailPM}
                  onChange={(e) => setNotifications({...notifications, emailPM: e.target.checked})}
                  className="w-5 h-5 text-[#124481]"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Email Notifications - Warranty Claims</p>
                  <p className="text-sm text-gray-600">Alerts for warranty claim opportunities</p>
                </div>
                <input
                  type="checkbox"
                  checked={notifications.emailWarranty}
                  onChange={(e) => setNotifications({...notifications, emailWarranty: e.target.checked})}
                  className="w-5 h-5 text-[#124481]"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">SMS Alerts</p>
                  <p className="text-sm text-gray-600">Receive text message alerts for urgent items</p>
                </div>
                <Badge className="bg-yellow-500">Coming Soon</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button - Only show for admins */}
        {canEditCompanyInfo && (
          <div className="flex justify-end gap-3">
            <Button variant="outline">
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={saving}
              className="bg-[#124481] hover:bg-[#1E7083]"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
