"use client";

import React, { useState, useEffect, Suspense, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  Home,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Trash2,
  Star,
  MapPin,
  IndianRupee,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  Info,
  Save,
  Check,
  Image as ImageIcon,
  Navigation,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import {
  INDIAN_STATES,
  STATE_DISTRICTS_MAP,
  lookupPincode,
  geocodeLocation,
  getCurrentBrowserLocation,
} from "@/lib/india-locations";
import { MiniMap } from "@/components/map/MiniMap";
import {
  Property,
  PropertyFormData,
  PropertyImage,
  PropertyType,
  ListingType,
  FurnishingType,
  PreferredTenantType,
} from "@/types/property";

const INITIAL_FORM_DATA: PropertyFormData = {
  // Step 1: Basic Details
  title: "",
  propertyType: "APARTMENT",
  listingType: "RENT",
  bhk: 2,
  bedrooms: 2,
  bathrooms: 2,
  floorNumber: 2,
  totalFloors: 5,

  // Step 2: Pricing & Areas
  price: 25000,
  maintenanceCharges: 2500,
  securityDeposit: 100000,
  carpetArea: 950,
  builtUpArea: 1150,
  availabilityDate: new Date().toISOString().split("T")[0],

  // Step 3: Location
  state: "Karnataka",
  city: "Bangalore",
  district: "Bengaluru Urban",
  locality: "Indiranagar",
  address: "",
  pincode: "560038",
  latitude: 12.9733,
  longitude: 77.6405,

  // Step 4: Amenities & Rules
  furnishing: "SEMI_FURNISHED",
  preferredTenant: "ANY",
  amenities: ["Parking", "Lift", "Security", "Power Backup", "Water Supply"],
  description: "",
};

const AMENITY_OPTIONS = [
  "Parking",
  "Lift",
  "Gym",
  "Security",
  "Power Backup",
  "Water Supply",
  "Swimming Pool",
  "Clubhouse",
  "Gas Pipeline",
  "Park",
  "CCTV",
  "Air Conditioning",
];

function PropertyCreationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const existingId = searchParams.get("id");

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [formData, setFormData] = useState<PropertyFormData>(INITIAL_FORM_DATA);
  const [propertyId, setPropertyId] = useState<number | null>(
    existingId ? parseInt(existingId, 10) : null
  );
  const [uploadedImages, setUploadedImages] = useState<PropertyImage[]>([]);

  // UI state
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showSubmissionSuccess, setShowSubmissionSuccess] = useState(false);

  // Step 3 Location helpers & state
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isLookingUpPin, setIsLookingUpPin] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [localitySuggestions, setLocalitySuggestions] = useState<string[]>([]);
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const [stateSearchQuery, setStateSearchQuery] = useState("");
  const [districtSearchQuery, setDistrictSearchQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing property if editing an existing draft
  useEffect(() => {
    if (existingId && isAuthenticated) {
      const fetchProperty = async () => {
        try {
          const res = await apiClient.get(`/properties/${existingId}`);
          const property: Property = res.data?.data ?? res.data;
          if (property) {
            setPropertyId(property.id);
            setFormData({
              title: property.title || "",
              propertyType: property.propertyType || "APARTMENT",
              listingType: property.listingType || "RENT",
              bhk: property.bhk || 2,
              bedrooms: property.bedrooms || 2,
              bathrooms: property.bathrooms || 2,
              floorNumber: property.floorNumber || 1,
              totalFloors: property.totalFloors || 4,
              price: property.price || 0,
              maintenanceCharges: property.maintenanceCharges || 0,
              securityDeposit: property.securityDeposit || 0,
              carpetArea: property.carpetArea || 0,
              builtUpArea: property.builtUpArea || 0,
              availabilityDate:
                property.availabilityDate ||
                new Date().toISOString().split("T")[0],
              state: property.state || "Karnataka",
              city: property.city || "Bangalore",
              district: property.district || "Bengaluru Urban",
              locality: property.locality || "",
              address: property.address || "",
              pincode: property.pincode || "",
              latitude: property.latitude || 12.9733,
              longitude: property.longitude || 77.6405,
              furnishing: property.furnishing || "SEMI_FURNISHED",
              preferredTenant: property.preferredTenant || "ANY",
              amenities: property.amenities || [
                "Parking",
                "Lift",
                "Security",
                "Power Backup",
                "Water Supply",
              ],
              description: property.description || "",
            });
            if (property.images) {
              setUploadedImages(property.images);
            }
          }
        } catch (err: unknown) {
          console.error("Failed to load existing property", err);
        }
      };
      fetchProperty();
    }
  }, [existingId, isAuthenticated]);

  // Handle PIN Code auto-lookup
  const handlePincodeChange = async (newPin: string) => {
    updateField("pincode", newPin);
    if (/^[1-9][0-9]{5}$/.test(newPin.trim())) {
      setIsLookingUpPin(true);
      setLocationStatusMessage("Looking up postal records for PIN " + newPin.trim() + "...");
      try {
        const result = await lookupPincode(newPin.trim());
        if (result.success && result.state) {
          setFormData((prev) => ({
            ...prev,
            pincode: newPin.trim(),
            state: result.state || prev.state,
            district: result.district || prev.district,
            city: result.city || prev.city || result.district || "",
          }));
          if (result.localities.length > 0) {
            setLocalitySuggestions(result.localities);
          }
          setLocationStatusMessage(
            `Postal data loaded: ${result.district}, ${result.state} (${result.localities.length} localities detected)`
          );

          // Geocode with latest details
          const geo = await geocodeLocation({
            locality: formData.locality || result.localities[0],
            city: result.city || result.district,
            district: result.district,
            state: result.state,
            pincode: newPin.trim(),
          });
          if (geo) {
            setFormData((prev) => ({
              ...prev,
              latitude: geo.latitude,
              longitude: geo.longitude,
            }));
          }
        } else {
          setLocationStatusMessage(
            result.message || "Postal lookup returned no match. You may enter details manually."
          );
        }
      } catch (err) {
        console.warn("Pincode lookup error:", err);
      } finally {
        setIsLookingUpPin(false);
      }
    }
  };

  // Handle State selection change
  const handleStateChange = async (newState: string) => {
    const districts = STATE_DISTRICTS_MAP[newState] || [];
    const validCurrentDistrict = districts.includes(formData.district);
    const updatedDistrict = validCurrentDistrict ? formData.district : (districts[0] || "");
    const updatedCity = validCurrentDistrict ? formData.city : updatedDistrict;

    setFormData((prev) => ({
      ...prev,
      state: newState,
      district: updatedDistrict,
      city: updatedCity,
    }));
    setDistrictSearchQuery("");

    setIsGeocoding(true);
    try {
      const geo = await geocodeLocation({
        locality: formData.locality,
        city: updatedCity,
        district: updatedDistrict,
        state: newState,
        pincode: formData.pincode,
      });
      if (geo) {
        setFormData((prev) => ({
          ...prev,
          latitude: geo.latitude,
          longitude: geo.longitude,
        }));
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle District selection change
  const handleDistrictChange = async (newDistrict: string) => {
    setFormData((prev) => ({
      ...prev,
      district: newDistrict,
      city: prev.city || newDistrict,
    }));

    setIsGeocoding(true);
    try {
      const geo = await geocodeLocation({
        locality: formData.locality,
        city: formData.city || newDistrict,
        district: newDistrict,
        state: formData.state,
        pincode: formData.pincode,
      });
      if (geo) {
        setFormData((prev) => ({
          ...prev,
          latitude: geo.latitude,
          longitude: geo.longitude,
        }));
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle Locality select / click
  const handleLocalitySelect = async (loc: string) => {
    updateField("locality", loc);
    setIsGeocoding(true);
    try {
      const geo = await geocodeLocation({
        locality: loc,
        city: formData.city,
        district: formData.district,
        state: formData.state,
        pincode: formData.pincode,
      });
      if (geo) {
        setFormData((prev) => ({
          ...prev,
          latitude: geo.latitude,
          longitude: geo.longitude,
        }));
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  // Handle GPS / Browser Location auto-detection
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    setLocationStatusMessage("Detecting your location & administrative division...");
    try {
      const loc = await getCurrentBrowserLocation();
      setFormData((prev) => ({
        ...prev,
        state: loc.state || prev.state,
        district: loc.district || prev.district,
        city: loc.city || prev.city,
        locality: loc.locality || prev.locality,
        address: prev.address || loc.address || "",
        pincode: loc.pincode || prev.pincode,
        latitude: loc.latitude,
        longitude: loc.longitude,
      }));
      setLocationStatusMessage(
        `✓ Detected: ${loc.locality ? loc.locality + ", " : ""}${loc.district || loc.city}, ${loc.state}`
      );
    } catch (err: any) {
      setLocationStatusMessage(err.message || "Failed to detect location. Please select manually.");
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Handle Refresh Map Coordinates
  const handleRefreshCoordinates = async () => {
    setIsGeocoding(true);
    setLocationStatusMessage("Pinpointing property coordinates on map...");
    try {
      const geo = await geocodeLocation({
        address: formData.address,
        locality: formData.locality,
        city: formData.city,
        district: formData.district,
        state: formData.state,
        pincode: formData.pincode,
      });
      if (geo) {
        setFormData((prev) => ({
          ...prev,
          latitude: geo.latitude,
          longitude: geo.longitude,
        }));
        setLocationStatusMessage(`✓ Coordinates updated: ${geo.displayName}`);
      } else {
        setLocationStatusMessage("Could not pinpoint exact address. Approximate center used.");
      }
    } finally {
      setIsGeocoding(false);
    }
  };

  // Form field update helper
  const updateField = <K extends keyof PropertyFormData>(
    field: K,
    value: PropertyFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Toggle amenity tag
  const toggleAmenity = (amenity: string) => {
    setFormData((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  // Validation per step
  const validateStep = (step: number): string | null => {
    if (step === 1) {
      if (!formData.title.trim()) return "Please enter a descriptive property title";
      if (formData.title.trim().length < 5)
        return "Property title should be at least 5 characters long";
    }
    if (step === 2) {
      if (!formData.price || formData.price <= 0)
        return "Please enter a valid price/rent amount";
    }
    if (step === 3) {
      if (!formData.state.trim()) return "State is required";
      if (!formData.city.trim()) return "City is required";
      if (!formData.district.trim()) return "District is required";
      if (!formData.locality.trim()) return "Locality / Neighborhood is required";
      if (!formData.address.trim()) return "Complete address is required";
      if (!formData.pincode.trim() || !/^\d{6}$/.test(formData.pincode.trim()))
        return "Please enter a valid 6-digit PIN code";
    }
    return null;
  };

  // Save or update draft on backend
  const saveDraft = async (suppressMessage = false): Promise<number | null> => {
    setIsSavingDraft(true);
    setErrorMessage(null);
    try {
      if (propertyId) {
        // Update existing draft
        const res = await apiClient.put(`/properties/${propertyId}`, formData);
        if (!suppressMessage) {
          setSuccessMessage("Draft updated successfully!");
          setTimeout(() => setSuccessMessage(null), 3000);
        }
        return propertyId;
      } else {
        // Create new draft
        const res = await apiClient.post("/properties", formData);
        const created: Property = res.data?.data ?? res.data;
        setPropertyId(created.id);
        if (!suppressMessage) {
          setSuccessMessage("Draft saved successfully!");
          setTimeout(() => setSuccessMessage(null), 3000);
        }
        return created.id;
      }
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        errorObj.response?.data?.message ||
        errorObj.message ||
        "Failed to save draft.";
      setErrorMessage(msg);
      return null;
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Navigation handlers
  const handleNextStep = async () => {
    setErrorMessage(null);
    const error = validateStep(currentStep);
    if (error) {
      setErrorMessage(error);
      return;
    }

    // When advancing from step 4 to step 5 (Photos), ensure draft is saved so propertyId exists for images
    if (currentStep === 4) {
      const savedId = await saveDraft(true);
      if (!savedId) return; // Errored during draft save
    }

    setCurrentStep((prev) => Math.min(prev + 1, 5));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePrevStep = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Step 5: Photo Upload
  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!propertyId) {
      const savedId = await saveDraft(true);
      if (!savedId) {
        setErrorMessage("Please save property details before uploading photos.");
        return;
      }
    }

    const currentId = propertyId;
    if (!currentId) return;

    setIsUploadingPhoto(true);
    setErrorMessage(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Client-side size check (10MB)
        if (file.size > 10 * 1024 * 1024) {
          setErrorMessage(`File ${file.name} exceeds 10MB limit.`);
          continue;
        }

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);

        const res = await apiClient.post(
          `/properties/${currentId}/images`,
          uploadFormData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        const newImage: PropertyImage = res.data?.data ?? res.data;
        setUploadedImages((prev) => [...prev, newImage]);
      }
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErrorMessage(
        errorObj.response?.data?.message ||
          errorObj.message ||
          "Failed to upload one or more photos."
      );
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Step 5: Set Primary Cover
  const handleSetPrimary = async (imageId: number) => {
    if (!propertyId) return;
    try {
      await apiClient.put(`/properties/${propertyId}/images/${imageId}/primary`);
      setUploadedImages((prev) =>
        prev.map((img) => ({
          ...img,
          isPrimary: img.id === imageId,
        }))
      );
    } catch (err: unknown) {
      console.error("Failed to set primary cover photo", err);
    }
  };

  // Step 5: Delete Photo
  const handleDeletePhoto = async (imageId: number) => {
    if (!propertyId) return;
    try {
      await apiClient.delete(`/properties/${propertyId}/images/${imageId}`);
      setUploadedImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err: unknown) {
      console.error("Failed to delete photo", err);
    }
  };

  // Step 5: Submit Property for Review
  const handleSubmitProperty = async () => {
    setErrorMessage(null);

    if (!propertyId) {
      setErrorMessage("Please save draft details before submitting.");
      return;
    }

    if (uploadedImages.length === 0) {
      setErrorMessage(
        "Please upload at least 1 photo of the property before submitting for review."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // First ensure latest specs are updated
      await apiClient.put(`/properties/${propertyId}`, formData);

      // Call submit endpoint
      await apiClient.put(`/properties/${propertyId}/submit`);

      setShowSubmissionSuccess(true);
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setErrorMessage(
        errorObj.response?.data?.message ||
          errorObj.message ||
          "Failed to submit property. Ensure all mandatory fields and at least 1 photo are provided."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Basic Details" },
    { number: 2, title: "Pricing & Areas" },
    { number: 3, title: "Location" },
    { number: 4, title: "Amenities & Rules" },
    { number: 5, title: "Photos & Review" },
  ];

  return (
    <div className="min-h-screen bg-sand flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Breadcrumb & Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E4DD] pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-light mb-1">
              <Link href="/owner/dashboard" className="hover:text-forest">
                Owner Portal
              </Link>
              <span>/</span>
              <span className="text-forest font-bold">
                {propertyId ? `Edit Draft #${propertyId}` : "New Property Listing"}
              </span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-charcoal tracking-tight">
              {propertyId ? "Continue Property Draft" : "List Your Property"}
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-light mt-0.5">
              100% Free • Zero Brokerage • Direct Tenant Connections
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              disabled={isSavingDraft}
              onClick={() => saveDraft()}
              className="px-4 py-2 rounded-xl border border-[#E8E4DD] hover:border-forest/40 bg-white text-xs font-bold text-charcoal hover:text-forest transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5 text-forest" />
              <span>{isSavingDraft ? "Saving..." : "Save Draft"}</span>
            </button>
            <Link
              href="/owner/properties"
              className="px-4 py-2 rounded-xl text-xs font-bold text-charcoal-light hover:text-charcoal"
            >
              Exit
            </Link>
          </div>
        </div>

        {/* Multi-Step Stepper Header */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-[#E8E4DD] shadow-sm">
          <div className="flex items-center justify-between overflow-x-auto pb-2 sm:pb-0 gap-2">
            {steps.map((s, idx) => {
              const isCompleted = currentStep > s.number;
              const isCurrent = currentStep === s.number;

              return (
                <div key={s.number} className="flex items-center flex-1 min-w-[120px]">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted || isCurrent) {
                        setCurrentStep(s.number);
                      }
                    }}
                    className={`flex items-center gap-2.5 text-left group transition-opacity ${
                      !isCompleted && !isCurrent ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isCompleted
                          ? "bg-forest text-white"
                          : isCurrent
                          ? "bg-amber text-white ring-4 ring-amber/20"
                          : "bg-sand border border-[#E8E4DD] text-charcoal-light"
                      }`}
                    >
                      {isCompleted ? <Check className="w-4 h-4" /> : s.number}
                    </div>
                    <div className="hidden sm:block">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-charcoal-light">
                        Step {s.number}
                      </span>
                      <span
                        className={`block text-xs font-bold whitespace-nowrap ${
                          isCurrent ? "text-forest" : "text-charcoal"
                        }`}
                      >
                        {s.title}
                      </span>
                    </div>
                  </button>

                  {idx < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 mx-3 hidden md:block transition-colors ${
                        currentStep > s.number ? "bg-forest" : "bg-[#E8E4DD]"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Notifications */}
        {errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm animate-in fade-in duration-150">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>{errorMessage}</div>
          </div>
        )}

        {successMessage && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm animate-in fade-in duration-150">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Form Wizard Cards */}
        <div className="bg-white rounded-3xl border border-[#E8E4DD] shadow-sm p-6 sm:p-10 space-y-8">
          {/* ================= STEP 1: BASIC DETAILS ================= */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  Basic Property Details
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light mt-1">
                  Specify whether you are renting or selling, the layout structure, and a clear title.
                </p>
              </div>

              {/* Listing Type: RENT vs SALE */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Listing Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {(["RENT", "SALE"] as ListingType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => updateField("listingType", type)}
                      className={`py-3.5 px-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        formData.listingType === type
                          ? "border-forest bg-forest-light text-forest shadow-sm"
                          : "border-[#E8E4DD] hover:border-forest/30 bg-white text-charcoal"
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      <span>{type === "RENT" ? "For Rent" : "For Sale"}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Property Type: APARTMENT, HOUSE, VILLA, etc */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Property Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { id: "APARTMENT", label: "Apartment" },
                      { id: "HOUSE", label: "Independent House" },
                      { id: "VILLA", label: "Gated Villa" },
                      { id: "STUDIO", label: "Studio Apartment" },
                    ] as { id: PropertyType; label: string }[]
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => updateField("propertyType", cat.id)}
                      className={`p-3.5 rounded-2xl border-2 text-xs font-bold transition-all text-center ${
                        formData.propertyType === cat.id
                          ? "border-forest bg-forest-light text-forest shadow-sm"
                          : "border-[#E8E4DD] hover:border-forest/30 bg-white text-charcoal"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label
                  htmlFor="title"
                  className="block text-xs font-bold uppercase tracking-wider text-charcoal"
                >
                  Listing Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="e.g. Spacious 3 BHK Luxury Apartment in Indiranagar with Balcony"
                  className="w-full px-4 py-3 bg-sand/40 border border-[#DDD8CE] rounded-xl text-sm text-charcoal placeholder-charcoal-light/50 focus:outline-none focus:border-forest focus:ring-2 focus:ring-forest/15"
                />
                <p className="text-[11px] text-charcoal-light">
                  Include BHK, key landmark, or standout feature for higher visibility.
                </p>
              </div>

              {/* BHK, Bedrooms, Bathrooms Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    BHK Configuration
                  </label>
                  <select
                    value={formData.bhk}
                    onChange={(e) => updateField("bhk", parseInt(e.target.value, 10))}
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  >
                    <option value={1}>1 BHK</option>
                    <option value={2}>2 BHK</option>
                    <option value={3}>3 BHK</option>
                    <option value={4}>4 BHK</option>
                    <option value={5}>5+ BHK</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Bedrooms
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.bedrooms}
                    onChange={(e) =>
                      updateField("bedrooms", parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Bathrooms
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={formData.bathrooms}
                    onChange={(e) =>
                      updateField("bathrooms", parseInt(e.target.value, 10) || 1)
                    }
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Floor details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Floor Number
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.floorNumber ?? 0}
                    onChange={(e) =>
                      updateField("floorNumber", parseInt(e.target.value, 10) || 0)
                    }
                    placeholder="e.g. 3 (0 for ground floor)"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Total Floors in Building
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.totalFloors ?? 1}
                    onChange={(e) =>
                      updateField("totalFloors", parseInt(e.target.value, 10) || 1)
                    }
                    placeholder="e.g. 8"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: PRICING & AREAS ================= */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  Pricing &amp; Area Specifications
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light mt-1">
                  Transparent pricing attracts authentic tenant enquiries without endless haggling.
                </p>
              </div>

              {/* Price / Rent field with prominent currency callout */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="price"
                    className="block text-xs font-bold uppercase tracking-wider text-charcoal"
                  >
                    {formData.listingType === "RENT" ? "Monthly Rent (₹)" : "Selling Price (₹)"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <span className="text-xs font-bold text-forest">
                    ₹{Number(formData.price || 0).toLocaleString("en-IN")}{" "}
                    {formData.listingType === "RENT" ? "/ month" : ""}
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-charcoal-light">
                    <IndianRupee className="w-4 h-4 text-forest" />
                  </div>
                  <input
                    id="price"
                    type="number"
                    required
                    min={1}
                    value={formData.price}
                    onChange={(e) =>
                      updateField("price", parseFloat(e.target.value) || 0)
                    }
                    placeholder="45000"
                    className="w-full pl-10 pr-4 py-3.5 bg-white border-2 border-forest/30 rounded-xl text-base font-bold text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Maintenance & Security Deposit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Maintenance Charges (₹ / month)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.maintenanceCharges}
                    onChange={(e) =>
                      updateField("maintenanceCharges", parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 2500"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Security Deposit (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.securityDeposit}
                    onChange={(e) =>
                      updateField("securityDeposit", parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 150000"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Carpet Area & Built-up Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Carpet Area (sq.ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.carpetArea}
                    onChange={(e) =>
                      updateField("carpetArea", parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 1100"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                  <p className="text-[11px] text-charcoal-light">Usable floor area inside walls.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Super Built-up Area (sq.ft)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.builtUpArea}
                    onChange={(e) =>
                      updateField("builtUpArea", parseFloat(e.target.value) || 0)
                    }
                    placeholder="e.g. 1350"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Availability Date */}
              <div className="space-y-1.5 max-w-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Available From Date
                </label>
                <input
                  type="date"
                  value={formData.availabilityDate}
                  onChange={(e) => updateField("availabilityDate", e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 3: LOCATION & ADMINISTRATIVE DIVISIONS ================= */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-charcoal">
                    Property Location &amp; Address
                  </h2>
                  <p className="text-xs sm:text-sm text-charcoal-light mt-1">
                    Select genuine Indian administrative divisions or auto-detect your location for authentic map discovery.
                  </p>
                </div>

                {/* Auto-detect button */}
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={isDetectingLocation}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-forest/10 hover:bg-forest/20 text-forest font-bold text-xs rounded-xl transition border border-forest/20 shadow-sm disabled:opacity-50 self-start sm:self-auto"
                >
                  {isDetectingLocation ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Navigation className="w-4 h-4" />
                  )}
                  {isDetectingLocation ? "Detecting Location..." : "Auto-Detect My Location"}
                </button>
              </div>

              {/* Status message banner */}
              {locationStatusMessage && (
                <div className="p-3 bg-forest/5 border border-forest/20 rounded-xl flex items-center justify-between text-xs text-forest">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 flex-shrink-0 text-amber" />
                    <span>{locationStatusMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationStatusMessage(null)}
                    className="text-charcoal-light hover:text-charcoal text-[11px] font-bold ml-2"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Postal PIN Code Quick Lookup */}
              <div className="p-4 bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Postal PIN Code <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-charcoal-light">
                    Typing 6 digits automatically populates State, District &amp; Localities
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      placeholder="e.g. 560038"
                      className="w-full pl-4 pr-10 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm font-bold text-charcoal focus:outline-none focus:border-forest tracking-wider"
                    />
                    {isLookingUpPin && (
                      <div className="absolute right-3 top-3 text-forest">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePincodeChange(formData.pincode)}
                    disabled={isLookingUpPin || !formData.pincode || formData.pincode.length !== 6}
                    className="px-4 py-3 bg-forest text-white text-xs font-bold rounded-xl hover:bg-forest/90 transition disabled:opacity-40"
                  >
                    Lookup PIN
                  </button>
                </div>
              </div>

              {/* Cascading State, District, City */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* State Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    State / UT <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal font-medium focus:outline-none focus:border-forest cursor-pointer"
                  >
                    <option value="" disabled>Select State / UT</option>
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Dropdown (Cascaded from State) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal font-medium focus:outline-none focus:border-forest cursor-pointer"
                  >
                    <option value="" disabled>Select District</option>
                    {(STATE_DISTRICTS_MAP[formData.state] || []).map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>

                {/* City / Taluk */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    City / Taluk / Tehsil <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => updateField("city", e.target.value)}
                    placeholder="e.g. Bangalore or Anekal"
                    className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Locality / Neighborhood with suggestion chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Locality / Neighborhood / Sector <span className="text-red-500">*</span>
                  </label>
                  {isGeocoding && (
                    <span className="text-[11px] text-forest flex items-center gap-1 font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Pinpointing coordinates...
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={formData.locality}
                  onChange={(e) => handleLocalitySelect(e.target.value)}
                  placeholder="e.g. Indiranagar 100ft Road or Koramangala 4th Block"
                  className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                />

                {/* Postal locality suggestions */}
                {localitySuggestions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-charcoal-light uppercase tracking-wider">
                      Detected Postal Localities (Click to auto-fill):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {localitySuggestions.map((loc) => (
                        <button
                          key={loc}
                          type="button"
                          onClick={() => handleLocalitySelect(loc)}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition ${
                            formData.locality === loc
                              ? "bg-forest text-white border-forest font-semibold"
                              : "bg-white text-charcoal border-[#DDD8CE] hover:border-forest hover:text-forest"
                          }`}
                        >
                          {loc}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Complete Address & Landmark */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Complete Address &amp; Landmark <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  placeholder="e.g. Flat 302, Palm Heights, 12th Main Road, HAL 2nd Stage, near Metro Station"
                  className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                />
                <p className="text-[11px] text-charcoal-light">
                  Exact house number will be masked on the public search map and only revealed to verified tenants on confirmed site visits.
                </p>
              </div>

              {/* Interactive Map Pin Verification (MapLibre GL JS + OpenFreeMap) */}
              <div className="p-4 bg-[#FBF9F5] border border-[#DDD8CE] rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-forest" />
                    <span className="text-xs font-bold uppercase tracking-wider text-charcoal">
                      Marketplace Map Location Preview
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-charcoal-light bg-white px-2.5 py-1 rounded-lg border border-[#DDD8CE]">
                      {formData.latitude ? Number(formData.latitude).toFixed(4) : "12.9733"}° N,{" "}
                      {formData.longitude ? Number(formData.longitude).toFixed(4) : "77.6405"}° E
                    </span>
                    <button
                      type="button"
                      onClick={handleRefreshCoordinates}
                      disabled={isGeocoding}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-forest bg-white hover:bg-forest/10 border border-forest/30 rounded-lg transition disabled:opacity-50"
                      title="Re-pinpoint coordinates using current address"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isGeocoding ? "animate-spin" : ""}`} />
                      Re-center
                    </button>
                  </div>
                </div>

                <div className="w-full h-56 rounded-xl overflow-hidden border border-[#DDD8CE] shadow-inner relative">
                  <MiniMap
                    latitude={formData.latitude || 12.9733}
                    longitude={formData.longitude || 77.6405}
                    locality={formData.locality || formData.city}
                  />
                </div>

                <p className="text-[11px] text-charcoal-light flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-forest flex-shrink-0" />
                  Your listing will be indexed using these verified coordinates with a 350-meter privacy radius.
                </p>
              </div>
            </div>
          )}

          {/* ================= STEP 4: AMENITIES & RULES ================= */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  Furnishing, Rules &amp; Amenities
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light mt-1">
                  Highlight facilities available in the unit and residential society.
                </p>
              </div>

              {/* Furnishing Status */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Furnishing Status
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      { id: "FURNISHED", label: "Fully Furnished" },
                      { id: "SEMI_FURNISHED", label: "Semi Furnished" },
                      { id: "UNFURNISHED", label: "Unfurnished" },
                    ] as { id: FurnishingType; label: string }[]
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => updateField("furnishing", f.id)}
                      className={`py-3 px-4 rounded-2xl border-2 text-xs font-bold transition-all text-center ${
                        formData.furnishing === f.id
                          ? "border-forest bg-forest-light text-forest shadow-sm"
                          : "border-[#E8E4DD] hover:border-forest/30 bg-white text-charcoal"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Tenant */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Preferred Tenant
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { id: "ANY", label: "All / Any" },
                      { id: "FAMILY", label: "Family" },
                      { id: "BACHELORS", label: "Bachelors" },
                      { id: "COMPANY", label: "Corporate / Company" },
                    ] as { id: PreferredTenantType; label: string }[]
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => updateField("preferredTenant", t.id)}
                      className={`py-3 px-3 rounded-2xl border-2 text-xs font-bold transition-all text-center ${
                        formData.preferredTenant === t.id
                          ? "border-forest bg-forest-light text-forest shadow-sm"
                          : "border-[#E8E4DD] hover:border-forest/30 bg-white text-charcoal"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amenities Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Select Amenities
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {AMENITY_OPTIONS.map((amenity) => {
                    const isSelected = formData.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleAmenity(amenity)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-forest text-white shadow-sm"
                            : "bg-sand hover:bg-sand-muted border border-[#E8E4DD] text-charcoal"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber" />}
                        <span>{amenity}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                  Property Description &amp; Highlights
                </label>
                <textarea
                  rows={4}
                  value={formData.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Provide details about ventilation, sunlight, modular kitchen, society security, nearby schools or transit..."
                  className="w-full px-4 py-3 bg-white border border-[#DDD8CE] rounded-xl text-sm text-charcoal focus:outline-none focus:border-forest"
                />
              </div>
            </div>
          )}

          {/* ================= STEP 5: PHOTOS & REVIEW ================= */}
          {currentStep === 5 && (
            <div className="space-y-8 animate-in fade-in duration-150">
              <div>
                <h2 className="font-serif text-2xl font-bold text-charcoal">
                  Photos &amp; Final Review
                </h2>
                <p className="text-xs sm:text-sm text-charcoal-light mt-1">
                  Upload crisp photos of bedrooms, hall, and kitchen. Select a cover photo before submitting.
                </p>
              </div>

              {/* Photo Upload Zone */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-charcoal">
                    Property Photos ({uploadedImages.length} uploaded)
                  </label>
                  <span className="text-xs font-semibold text-amber">
                    Minimum 1 photo required
                  </span>
                </div>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handlePhotoUpload(e.target.files)}
                  className="hidden"
                />

                {/* Dropzone Container */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handlePhotoUpload(e.dataTransfer.files);
                  }}
                  className="border-2 border-dashed border-[#DDD8CE] hover:border-forest rounded-3xl p-8 text-center bg-sand/40 hover:bg-forest-light/20 transition-all cursor-pointer space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-white border border-[#E8E4DD] text-forest mx-auto flex items-center justify-center shadow-sm">
                    {isUploadingPhoto ? (
                      <div className="animate-spin w-6 h-6 border-2 border-forest border-t-transparent rounded-full" />
                    ) : (
                      <Upload className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-charcoal">
                      Click to upload photos or drag and drop files here
                    </p>
                    <p className="text-xs text-charcoal-light mt-1">
                      JPEG, PNG, or WebP up to 10MB each.
                    </p>
                  </div>
                </div>

                {/* Photo Previews Gallery */}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                    {uploadedImages.map((image) => {
                      const imgUrl =
                        image.url ||
                        (image.storageKey ? `/uploads/${image.storageKey}` : "");

                      return (
                        <div
                          key={image.id}
                          className={`relative rounded-2xl overflow-hidden border-2 bg-sand transition-all group ${
                            image.isPrimary
                              ? "border-amber ring-2 ring-amber/30"
                              : "border-[#E8E4DD]"
                          }`}
                        >
                          <div className="h-32 w-full overflow-hidden bg-gray-100">
                            <img
                              src={imgUrl}
                              alt="Property"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          {/* Primary Cover Badge */}
                          {image.isPrimary && (
                            <div className="absolute top-2 left-2 bg-amber text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow">
                              <Star className="w-3 h-3 fill-current" />
                              <span>Cover Photo</span>
                            </div>
                          )}

                          {/* Image Actions Overlay */}
                          <div className="p-2 bg-white flex items-center justify-between text-xs">
                            {!image.isPrimary ? (
                              <button
                                type="button"
                                onClick={() => handleSetPrimary(image.id)}
                                className="text-[11px] font-bold text-charcoal-light hover:text-amber flex items-center gap-1"
                              >
                                <Star className="w-3 h-3" />
                                <span>Set Cover</span>
                              </button>
                            ) : (
                              <span className="text-[11px] font-bold text-amber">
                                Primary
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDeletePhoto(image.id)}
                              className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                              title="Delete Photo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Review Summary Card */}
              <div className="rounded-3xl p-6 bg-sand border border-[#E8E4DD] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8E4DD] pb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-forest">
                    Summary Review
                  </span>
                  <span className="text-xs font-semibold text-charcoal-light">
                    Zero Brokerage Guaranteed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-charcoal-light block">Title:</span>
                    <span className="font-bold text-charcoal">{formData.title}</span>
                  </div>
                  <div>
                    <span className="text-charcoal-light block">Price:</span>
                    <span className="font-bold text-forest text-sm">
                      ₹{Number(formData.price).toLocaleString("en-IN")}{" "}
                      {formData.listingType === "RENT" ? "/ mo" : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal-light block">Location:</span>
                    <span className="font-bold text-charcoal">
                      {formData.locality}, {formData.district}, {formData.city}
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal-light block">Configuration:</span>
                    <span className="font-bold text-charcoal">
                      {formData.bhk} BHK • {formData.propertyType} • {formData.furnishing}
                    </span>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-charcoal-light leading-relaxed border-t border-[#E8E4DD]">
                  By submitting this listing, you confirm that all specifications and photos are authentic and deed-authorized.
                </div>
              </div>

              {/* Submit Property for Review CTA */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E8E4DD]">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#E8E4DD] text-xs font-bold text-charcoal hover:bg-sand flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous Step</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || uploadedImages.length === 0}
                  onClick={handleSubmitProperty}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-forest hover:bg-forest-hover active:bg-[#072625] text-white text-sm font-bold shadow-lg hover:shadow-xl transition-all duration-150 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Submitting for Moderation...</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Property for Review</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Stepper Navigation Footer (Steps 1 to 4) */}
          {currentStep < 5 && (
            <div className="pt-6 border-t border-[#E8E4DD] flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="px-5 py-3 rounded-xl border border-[#E8E4DD] text-xs font-bold text-charcoal hover:bg-sand transition-colors flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Previous</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={handleNextStep}
                className="px-6 py-3 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 group"
              >
                <span>Next Step</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>

        {/* Modal: Submission Success */}
        {showSubmissionSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl max-w-lg w-full p-8 text-center space-y-6 border border-[#E8E4DD] shadow-2xl">
              <div className="w-16 h-16 rounded-full bg-forest-light text-forest mx-auto flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-amber" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-charcoal">
                  Property Submitted for Review!
                </h3>
                <p className="text-xs sm:text-sm text-charcoal-light leading-relaxed">
                  Your listing for{" "}
                  <span className="font-bold text-charcoal">
                    &ldquo;{formData.title}&rdquo;
                  </span>{" "}
                  has been transitioned to <span className="font-bold text-blue-600">SUBMITTED</span> status.
                  Our verification team will review your specs and photos within 24 hours.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-sand border border-[#E8E4DD] text-left text-xs space-y-2">
                <div className="flex items-center gap-2 text-forest font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>What happens next?</span>
                </div>
                <ul className="list-disc list-inside text-charcoal-light space-y-1 pl-1">
                  <li>Property details are locked for admin review.</li>
                  <li>Once approved, you can receive direct WhatsApp visits.</li>
                  <li>Zero brokerage will be charged at any time.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link
                  href="/owner/properties"
                  className="flex-1 py-3 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-bold transition-colors"
                >
                  View My Properties
                </Link>
                <Link
                  href="/owner/dashboard"
                  className="flex-1 py-3 rounded-xl border border-[#E8E4DD] text-charcoal hover:bg-sand text-xs font-bold transition-colors"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewPropertyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-sand flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-3 border-forest border-t-transparent rounded-full" />
        </div>
      }
    >
      <PropertyCreationWizard />
    </Suspense>
  );
}
