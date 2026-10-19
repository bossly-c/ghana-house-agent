export type ListingType = "rent" | "sale";

export type PropertyUnit = {
  id:          string;
  propertyId:  string;
  unitType:    string;
  bedrooms:    number;
  bathrooms:   number;
  halls:       number;
  price:       number;
  pricePeriod: string;
  available:   boolean;
  description: string | null;
  position:    number;
};

export type TourSceneDto = {
  id:       string;
  roomName: string;
  panoUrl:  string;
  position: number;
};

export type PropertyListItem = {
  id:             string;
  listingType:    ListingType;
  propertyType:   string;
  region:         string;
  address:        string;
  area?:          string;
  city?:          string;
  title:          string;
  lat:            number | null;
  lng:            number | null;
  price:          number;
  pricePeriod:    string;
  beds:           number;
  baths:          number;
  halls?:         number;
  photos:         string[];
  images?:        string[];
  description?:   string | null;
  isCompound:     boolean;
  units?:         PropertyUnit[];
  scenes?:        TourSceneDto[];
  agentName?:     string;
  agentPhone?:    string;
  agentWhatsApp?: string | null;
  viewingDays?:   string[];
  viewingTime?:   string;
  isVisible?:     boolean;          // ✅ new — owner can hide from map
  agentId?:       string;           // ✅ new — to identify owner's listings
  createdAt:      string;
};

export type PropertyDetail = {
  id:            string;
  listingType:   ListingType;
  propertyType:  string;
  region:        string;
  address:       string;
  area:          string;
  city:          string;
  title:         string;
  description:   string | null;
  lat:           number | null;
  lng:           number | null;
  beds:          number;
  baths:         number;
  halls:         number;
  price:         number;
  pricePeriod:   string;
  amenities:     string[];
  photos:        string[];
  images:        string[];
  availableDays: string[];
  availableFrom: string;
  availableTo:   string;
  viewingDays:   string[];
  viewingTime:   string;
  agentName:     string;
  agentPhone:    string;
  agentWhatsApp: string | null;
  views:         number;
  isCompound:    boolean;
  isVisible:     boolean;
  units:         PropertyUnit[];
  scenes:        TourSceneDto[];
  createdAt:     string;
};

export type PropertyFilters = {
  listing?:  ListingType;
  type?:     string;
  region?:   string;
  minPrice?: number;
  maxPrice?: number;
  beds?:     number;
};

export type AgentDto = {
  id:       string;
  name:     string;
  phone:    string;
  whatsapp: string | null;
  email:    string | null;
  photoUrl: string | null;
};