export const laboratoryEvents = [
  {
    title: 'HPLC Analysis',
    start: '2024-04-15T09:00:00',
    end: '2024-04-15T11:00:00',
    resourceId: 'equipment-1',
    extendedProps: {
      equipment: 'HPLC Machine',
      technician: 'Dr. Smith',
      sampleType: 'Water Solubility Test'
    }
  },
  {
    title: 'Mass Spectrometry',
    start: '2024-04-16T13:30:00',
    end: '2024-04-16T16:00:00',
    resourceId: 'equipment-2',
    extendedProps: {
      equipment: 'Mass Spectrometer',
      technician: 'Dr. Johnson',
      sampleType: 'Protein Analysis'
    }
  },
  {
    title: 'PCR Testing',
    start: '2024-04-17T10:00:00',
    end: '2024-04-17T12:30:00',
    resourceId: 'equipment-3',
    extendedProps: {
      equipment: 'PCR Machine',
      technician: 'Dr. Williams',
      sampleType: 'Genetic Screening'
    }
  }
];

export const laboratoryResources = [
  { id: 'equipment-1', title: 'HPLC Machine' },
  { id: 'equipment-2', title: 'Mass Spectrometer' },
  { id: 'equipment-3', title: 'PCR Machine' }
];