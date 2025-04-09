export const laboratoryEvents = [
  {
    title: 'HPLC Analysis',
    start: '2025-04-09T10:00:00',
    end: '2025-04-09T12:00:00',
    resourceId: 'equipment-1',
    extendedProps: {
      equipment: 'HPLC Machine',
      technician: 'Dr. Smith',
      sampleType: 'Water Solubility Test'
    }
  },
  {
    title: 'Mass Spectrometry',
    start: '2025-04-10T13:30:00',
    end: '2025-04-10T16:00:00',
    resourceId: 'equipment-2',
    extendedProps: {
      equipment: 'Mass Spectrometer',
      technician: 'Dr. Johnson',
      sampleType: 'Protein Analysis'
    }
  },
  {
    title: 'HPLC Testing',
    start: '2025-04-11T10:00:00',
    end: '2025-04-11T12:30:00',
    resourceId: 'equipment-3',
    extendedProps: {
      equipment: 'HPLC 1',
      technician: 'Dr. Williams',
      sampleType: 'Genetic Screening'
    }
  }
];

export const laboratoryResources = [
  { id: 'equipment-1', title: 'HPLC Machine' },
  { id: 'equipment-2', title: 'Mass Spectrometer' },
  { id: 'equipment-3', title: 'HPLC 1' }
];

// Demo tenant data
export const demoTenantEvents = [
  {
    id: 'demo-event-1',
    title: 'Sample Analysis',
    start: '2025-04-09T09:00:00',
    end: '2025-04-09T11:30:00',
    resourceId: 'demo-equip-1',
    extendedProps: {
      equipment: 'Microscope A',
      technician: 'Dr. Maria Chen',
      sampleType: 'Tissue Sample'
    }
  },
  {
    id: 'demo-event-2',
    title: 'Centrifuge Run',
    start: '2025-04-10T14:00:00',
    end: '2025-04-10T15:30:00',
    resourceId: 'demo-equip-2',
    extendedProps: {
      equipment: 'Ultra Centrifuge B',
      technician: 'Dr. Robert Kim',
      sampleType: 'Blood Separation'
    }
  },
  {
    id: 'demo-event-3',
    title: 'Calibration Check',
    start: '2025-04-11T08:30:00',
    end: '2025-04-11T10:00:00',
    resourceId: 'demo-equip-3',
    extendedProps: {
      equipment: 'pH Meter C',
      technician: 'Lab Tech Sarah',
      sampleType: 'Maintenance'
    }
  },
  {
    id: 'demo-event-4',
    title: 'HPLC',
    start: '2025-04-09T13:00:00',
    end: '2025-04-09T17:00:00',
    resourceId: 'demo-equip-4',
    extendedProps: {
      equipment: 'HPLC 1',
      technician: 'Dr. James Wilson',
      sampleType: 'Chemical'
    }
  },
  {
    id: 'demo-event-5',
    title: 'Spectroscopy',
    start: '2025-04-10T09:00:00',
    end: '2025-04-10T12:00:00',
    resourceId: 'demo-equip-5',
    extendedProps: {
      equipment: 'IR Spectrometer',
      technician: 'Dr. Emily Taylor',
      sampleType: 'Compound Analysis'
    }
  }
];

export const demoTenantResources = [
  { id: 'demo-equip-1', title: 'Microscope A' },
  { id: 'demo-equip-2', title: 'Ultra Centrifuge B' },
  { id: 'demo-equip-3', title: 'pH Meter C' },
  { id: 'demo-equip-4', title: 'HPLC 1' },
  { id: 'demo-equip-5', title: 'IR Spectrometer' }
];
