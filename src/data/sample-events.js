// src/data/sample-events.js
// CASE Industry (Coatings, Adhesives, Sealants, Elastomers) demo data

export const laboratoryEvents = [
  {
    title: 'Paint Viscosity Testing',
    start: '2025-04-09T10:00:00',
    end: '2025-04-09T12:00:00',
    resourceId: 'equipment-1',
    extendedProps: {
      equipment: 'Viscometer 1',
      technician: 'Dr. Maria Chen',
      sampleType: 'Interior Wall Paint',
      purpose: 'Utilization',
      cost: 350
    }
  },
  {
    title: 'Adhesive Strength Analysis',
    start: '2025-04-10T13:30:00',
    end: '2025-04-10T16:00:00',
    resourceId: 'equipment-2',
    extendedProps: {
      equipment: 'TensileTest 1',
      technician: 'Dr. James Wilson',
      sampleType: 'Construction Adhesive',
      purpose: 'Utilization',
      cost: 480
    }
  },
  {
    title: 'Coating Durability Test',
    start: '2025-04-11T10:00:00',
    end: '2025-04-11T12:30:00',
    resourceId: 'equipment-3',
    extendedProps: {
      equipment: 'Weatherometer 1',
      technician: 'Dr. Robert Kim',
      sampleType: 'Exterior Paint System',
      purpose: 'Utilization',
      cost: 620
    }
  }
];

export const laboratoryResources = [
  { id: 'equipment-1', title: 'Viscometer 1' },
  { id: 'equipment-2', title: 'TensileTest 1' },
  { id: 'equipment-3', title: 'Weatherometer 1' }
];

// Demo tenant data with CASE industry equipment
export const demoTenantEvents = [
  {
    id: 'demo-event-1',
    title: 'Paint Viscosity Testing',
    start: '2025-04-09T09:00:00',
    end: '2025-04-09T11:30:00',
    resourceId: 'demo-equip-1',
    equipment: 'Viscometer 1',
    location: 'Coatings Lab A',
    technician: 'Dr. Maria Chen',
    sampleType: 'Interior Latex Paint',
    purpose: 'Utilization',
    cost: 320,
    notes: 'Low-VOC paint formulation testing',
    extendedProps: {
      equipment: 'Viscometer 1',
      location: 'Coatings Lab A',
      technician: 'Dr. Maria Chen',
      sampleType: 'Interior Latex Paint',
      purpose: 'Utilization',
      cost: 320,
      department: 'Coatings R&D'
    }
  },
  {
    id: 'demo-event-2',
    title: 'Rheology Analysis',
    start: '2025-04-10T14:00:00',
    end: '2025-04-10T15:30:00',
    resourceId: 'demo-equip-2',
    equipment: 'Rheometer 1',
    location: 'Polymer Lab',
    technician: 'Sarah Johnson',
    sampleType: 'Epoxy Formulation',
    purpose: 'Utilization',
    cost: 410,
    notes: 'Shear thinning behavior characterization',
    extendedProps: {
      equipment: 'Rheometer 1',
      location: 'Polymer Lab',
      technician: 'Sarah Johnson',
      sampleType: 'Epoxy Formulation',
      purpose: 'Utilization',
      cost: 410,
      department: 'Adhesives R&D'
    }
  },
  {
    id: 'demo-event-3',
    title: 'Scheduled Maintenance',
    start: '2025-04-11T08:30:00',
    end: '2025-04-11T10:00:00',
    resourceId: 'demo-equip-3',
    equipment: 'FTIR 1',
    location: 'QC Lab',
    technician: 'Michael Brown',
    sampleType: 'Maintenance',
    purpose: 'Maintenance',
    cost: 250,
    notes: 'Quarterly calibration and detector check',
    extendedProps: {
      equipment: 'FTIR 1',
      location: 'QC Lab',
      technician: 'Michael Brown',
      sampleType: 'Maintenance',
      purpose: 'Maintenance',
      cost: 250,
      department: 'QA/QC'
    }
  },
  {
    id: 'demo-event-4',
    title: 'Thermal Analysis',
    start: '2025-04-09T13:00:00',
    end: '2025-04-09T17:00:00',
    resourceId: 'demo-equip-4',
    equipment: 'DSC 1',
    location: 'Thermal Lab',
    technician: 'Dr. Emily Taylor',
    sampleType: 'Sealant Samples',
    purpose: 'Utilization',
    cost: 580,
    notes: 'Glass transition and cure behavior analysis',
    extendedProps: {
      equipment: 'DSC 1',
      location: 'Thermal Lab',
      technician: 'Dr. Emily Taylor',
      sampleType: 'Sealant Samples',
      purpose: 'Utilization',
      cost: 580,
      department: 'Adhesives R&D'
    }
  },
  {
    id: 'demo-event-5',
    title: 'Spray Application Test',
    start: '2025-04-10T09:00:00',
    end: '2025-04-10T12:00:00',
    resourceId: 'demo-equip-5',
    equipment: 'SprayBooth 1',
    location: 'Application Lab',
    technician: 'David Garcia',
    sampleType: 'Automotive Coating',
    purpose: 'Utilization',
    cost: 490,
    notes: 'Spray pattern and coverage evaluation',
    extendedProps: {
      equipment: 'SprayBooth 1',
      location: 'Application Lab',
      technician: 'David Garcia',
      sampleType: 'Automotive Coating',
      purpose: 'Utilization',
      cost: 490,
      department: 'Formulations'
    }
  },
  {
    id: 'demo-event-6',
    title: 'Chemical Resistance',
    start: '2025-04-11T13:00:00',
    end: '2025-04-11T16:00:00',
    resourceId: 'demo-equip-6',
    equipment: 'SaltSpray 1',
    location: 'Exposure Chamber',
    technician: 'Thomas Nguyen',
    sampleType: 'Industrial Coating',
    purpose: 'Utilization',
    cost: 620,
    notes: 'Accelerated corrosion testing',
    extendedProps: {
      equipment: 'SaltSpray 1',
      location: 'Exposure Chamber',
      technician: 'Thomas Nguyen',
      sampleType: 'Industrial Coating',
      purpose: 'Utilization',
      cost: 620,
      department: 'Applications'
    }
  },
  {
    id: 'demo-event-7',
    title: 'Emergency Repair',
    start: '2025-04-08T10:30:00',
    end: '2025-04-08T15:00:00',
    resourceId: 'demo-equip-7',
    equipment: 'GCMS 1',
    location: 'Analytical Lab',
    technician: 'Alex Rodriguez',
    sampleType: 'Equipment',
    purpose: 'Broken',
    cost: 1350,
    notes: 'Mass spec detector failure - emergency repair',
    extendedProps: {
      equipment: 'GCMS 1',
      location: 'Analytical Lab',
      technician: 'Alex Rodriguez',
      sampleType: 'Equipment',
      purpose: 'Broken',
      cost: 1350,
      department: 'QA/QC'
    }
  },
  {
    id: 'demo-event-8',
    title: 'Adhesion Testing',
    start: '2025-04-12T09:00:00',
    end: '2025-04-12T11:00:00',
    resourceId: 'demo-equip-8',
    equipment: 'AdhesionTester 1',
    location: 'Physical Testing Lab',
    technician: 'James Wilson',
    sampleType: 'Concrete Primer',
    purpose: 'Utilization',
    cost: 380,
    notes: 'Pull-off adhesion testing on concrete substrates',
    extendedProps: {
      equipment: 'AdhesionTester 1',
      location: 'Physical Testing Lab',
      technician: 'James Wilson',
      sampleType: 'Concrete Primer',
      purpose: 'Utilization',
      cost: 380,
      department: 'Adhesives R&D'
    }
  },
  {
    id: 'demo-event-9',
    title: 'UV Resistance Testing',
    start: '2025-04-13T13:00:00',
    end: '2025-04-13T16:30:00',
    resourceId: 'demo-equip-9',
    equipment: 'Weatherometer 1',
    location: 'Exposure Lab',
    technician: 'Dr. Robert Kim',
    sampleType: 'Exterior Paint',
    purpose: 'Utilization',
    cost: 550,
    notes: 'Accelerated UV exposure testing',
    extendedProps: {
      equipment: 'Weatherometer 1',
      location: 'Exposure Lab',
      technician: 'Dr. Robert Kim',
      sampleType: 'Exterior Paint',
      purpose: 'Utilization',
      cost: 550,
      department: 'Coatings R&D'
    }
  },
  {
    id: 'demo-event-10',
    title: 'VOC Analysis',
    start: '2025-04-14T10:00:00',
    end: '2025-04-14T12:30:00',
    resourceId: 'demo-equip-7',
    equipment: 'GCMS 1',
    location: 'Analytical Lab',
    technician: 'Lisa Wong',
    sampleType: 'Water-based Paint',
    purpose: 'Utilization',
    cost: 420,
    notes: 'Volatile organic compound profile analysis',
    extendedProps: {
      equipment: 'GCMS 1',
      location: 'Analytical Lab',
      technician: 'Lisa Wong',
      sampleType: 'Water-based Paint',
      purpose: 'Utilization',
      cost: 420,
      department: 'Customer Support'
    }
  },
  {
    id: 'demo-event-11',
    title: 'Calibration Check',
    start: '2025-04-15T09:00:00',
    end: '2025-04-15T10:30:00',
    resourceId: 'demo-equip-10',
    equipment: 'TGA 1',
    location: 'Thermal Analysis Lab',
    technician: 'Dr. Emily Taylor',
    sampleType: 'Equipment',
    purpose: 'Maintenance',
    cost: 290,
    notes: 'Monthly calibration with reference standards',
    extendedProps: {
      equipment: 'TGA 1',
      location: 'Thermal Analysis Lab',
      technician: 'Dr. Emily Taylor',
      sampleType: 'Equipment',
      purpose: 'Maintenance',
      cost: 290,
      department: 'Adhesives R&D'
    }
  },
  {
    id: 'demo-event-12',
    title: 'Cure Rate Testing',
    start: '2025-04-16T14:00:00',
    end: '2025-04-16T17:00:00',
    resourceId: 'demo-equip-10',
    equipment: 'TGA 1',
    location: 'Thermal Analysis Lab',
    technician: 'Jessica Lee',
    sampleType: 'Epoxy Adhesive',
    purpose: 'Utilization',
    cost: 440,
    notes: 'Cure kinetics and residual catalyst analysis',
    extendedProps: {
      equipment: 'TGA 1',
      location: 'Thermal Analysis Lab',
      technician: 'Jessica Lee',
      sampleType: 'Epoxy Adhesive',
      purpose: 'Utilization',
      cost: 440,
      department: 'Formulations'
    }
  }
];

export const demoTenantResources = [
  { id: 'demo-equip-1', title: 'Viscometer 1', department: 'Coatings R&D', location: 'Coatings Lab A', maintenanceStatus: 'normal', acquisitionCost: 25000, hourlyRate: 120 },
  { id: 'demo-equip-2', title: 'Rheometer 1', department: 'Adhesives R&D', location: 'Polymer Lab', maintenanceStatus: 'normal', acquisitionCost: 85000, hourlyRate: 180 },
  { id: 'demo-equip-3', title: 'FTIR 1', department: 'QA/QC', location: 'QC Lab', maintenanceStatus: 'due', acquisitionCost: 120000, hourlyRate: 220, nextMaintenance: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString() },
  { id: 'demo-equip-4', title: 'DSC 1', department: 'Adhesives R&D', location: 'Thermal Lab', maintenanceStatus: 'normal', acquisitionCost: 90000, hourlyRate: 190 },
  { id: 'demo-equip-5', title: 'SprayBooth 1', department: 'Formulations', location: 'Application Lab', maintenanceStatus: 'normal', acquisitionCost: 45000, hourlyRate: 150 },
  { id: 'demo-equip-6', title: 'SaltSpray 1', department: 'Applications', location: 'Exposure Chamber', maintenanceStatus: 'normal', acquisitionCost: 60000, hourlyRate: 170 },
  { id: 'demo-equip-7', title: 'GCMS 1', department: 'QA/QC', location: 'Analytical Lab', maintenanceStatus: 'overdue', acquisitionCost: 230000, hourlyRate: 320, nextMaintenance: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString() },
  { id: 'demo-equip-8', title: 'AdhesionTester 1', department: 'Adhesives R&D', location: 'Physical Testing Lab', maintenanceStatus: 'normal', acquisitionCost: 55000, hourlyRate: 140 },
  { id: 'demo-equip-9', title: 'Weatherometer 1', department: 'Coatings R&D', location: 'Exposure Lab', maintenanceStatus: 'normal', acquisitionCost: 110000, hourlyRate: 210 },
  { id: 'demo-equip-10', title: 'TGA 1', department: 'Adhesives R&D', location: 'Thermal Analysis Lab', maintenanceStatus: 'normal', acquisitionCost: 95000, hourlyRate: 200 }
];
