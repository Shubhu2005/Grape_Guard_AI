// Sample mock data for development - will be replaced with backend API calls
export const mockFarmerRequests = [
    {
        request_id: 'REQ001',
        farmer_id: 'F001',
        farmer_name: 'Ramesh Kumar',
        status: 'waiting',
        disease_name: 'Powdery Mildew',
        description: 'Fungal disease affecting grape leaves. White powdery spots appear on leaves and stems.',
        symptoms_by_farmer: 'White powder on leaf surface, some curling observed',
        image_url: '/placeholder.svg',
        pesticides: {
            organic: [
                { name: 'Neem Oil', dosage: '5ml/L', precautions: 'Apply in evening, avoid direct sun' },
                { name: 'Baking Soda Spray', dosage: '10g/L water', precautions: 'Test on small area first' },
            ],
            chemical: [
                { name: 'Sulphur Spray', dosage: '10g/L', precautions: 'Wear gloves and mask' },
                { name: 'Myclobutanil', dosage: '0.5ml/L', precautions: 'Keep away from water sources' },
            ]
        },
        expert_validation: 'pending',
        expert_remarks: '',
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z'
    },
    {
        request_id: 'REQ002',
        farmer_id: 'F002',
        farmer_name: 'Suresh Patil',
        status: 'approved',
        disease_name: 'Downy Mildew',
        description: 'Caused by oomycete pathogen. Yellow spots on upper leaf surface.',
        symptoms_by_farmer: 'Yellow patches on leaves, white fuzzy growth underneath',
        image_url: '/placeholder.svg',
        pesticides: {
            organic: [
                { name: 'Copper Hydroxide', dosage: '3g/L', precautions: 'Do not mix with other chemicals' },
            ],
            chemical: [
                { name: 'Mancozeb', dosage: '2.5g/L', precautions: 'Avoid inhalation' },
            ]
        },
        expert_validation: 'valid',
        expert_remarks: 'Confirmed Downy Mildew. Recommended treatment is appropriate. Apply in early morning.',
        created_at: '2024-01-10T08:00:00Z',
        updated_at: '2024-01-11T14:00:00Z'
    },
    {
        request_id: 'REQ003',
        farmer_id: 'F001',
        farmer_name: 'Ramesh Kumar',
        status: 'rejected',
        disease_name: 'Black Rot',
        description: 'Fungal disease causing black lesions on leaves and fruit.',
        symptoms_by_farmer: 'Dark spots on leaves',
        image_url: '/placeholder.svg',
        pesticides: {
            organic: [
                { name: 'Bordeaux Mixture', dosage: '1%', precautions: 'Prepare fresh' },
            ],
            chemical: [
                { name: 'Captan', dosage: '2g/L', precautions: 'Toxic to fish' },
            ]
        },
        expert_validation: 'invalid',
        expert_remarks: 'Image quality insufficient for diagnosis. Please resubmit with clearer image showing affected area.',
        created_at: '2024-01-08T16:00:00Z',
        updated_at: '2024-01-09T10:00:00Z'
    },
];
// Get requests for a specific farmer
export const getFarmerRequests = (farmerId) => {
    return mockFarmerRequests.filter(req => req.farmer_id === farmerId);
};
// Get all pending requests for experts
export const getPendingRequests = () => {
    return mockFarmerRequests.filter(req => req.status === 'waiting');
};
// Get expert's reviewed requests
export const getReviewedRequests = () => {
    return mockFarmerRequests.filter(req => req.status !== 'waiting');
};
