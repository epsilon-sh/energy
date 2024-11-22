export interface Contract {
  Id: string;
  Name: string;
  Company: {
    Name: string;
    CompanyUrl: string;
    StreetAddress: string;
    PostalCode: string;
    PostalName: string;
    LogoURL: string;
  };
  Details: {
    ContractType: 'Spot' | 'Fixed' | 'OpenEnded';
    AvailabilityArea: {
      IsNational: boolean;
      PostalCodes: string[];
      Dsos: string[];
    };
    // Add other fields as needed
  };
} 