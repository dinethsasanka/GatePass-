import { useState, useEffect } from 'react';
import { FaBuilding, FaUsers, FaUserPlus, FaSearch, FaSitemap, FaSync } from 'react-icons/fa';
import { toast } from 'react-toastify';
import erpService from '../services/erpService';
import { userManagementService } from '../services/userManagementService';

const ErpEmployeeImport = () => {
  const [organizations, setOrganizations] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState(''); // Store actual org ID for API calls
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [selectedCostCenterId, setSelectedCostCenterId] = useState(''); // Store actual cost center ID for API calls
  const [searchEmployeeNo, setSearchEmployeeNo] = useState('');
  const [employeeHierarchy, setEmployeeHierarchy] = useState(null);
  const [loading, setLoading] = useState({
    orgs: false,
    costCenters: false,
    employees: false,
    hierarchy: false,
    importing: false
  });
  const [activeView, setActiveView] = useState('browse');

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(prev => ({ ...prev, orgs: true }));
    try {
      const result = await erpService.getOrganizations();
      console.log('ERP Organizations Response:', result);
      
      if (result.success && result.data) {
        // Handle nested data structure
        let orgData = result.data;
        
        // Check if data has another nested data property
        if (orgData.data && Array.isArray(orgData.data)) {
          orgData = orgData.data;
        } else if (!Array.isArray(orgData)) {
          orgData = [orgData];
        }
        
        console.log('Processed Organizations:', orgData);
        console.log('=== ORGANIZATION STRUCTURE DEBUG ===');
        console.log('First organization sample:', orgData[0]);
        console.log('Organization keys:', orgData[0] ? Object.keys(orgData[0]) : 'No data');
        console.log('All organization IDs:', orgData.map(o => ({
          id: o.organizationID || o.orgId || o.id || o.organizationId || o.ORGANIZATION_ID,
          name: o.organizationName || o.name
        })));
        console.log('===================================');
        setOrganizations(orgData);
        
        if (orgData.length > 0) {
          toast.success(`Loaded ${orgData.length} organizations`);
        } else {
          toast.warning('No organizations found in ERP system');
        }
      } else {
        toast.error('No data received from ERP');
        setOrganizations([]);
      }
    } catch (error) {
      toast.error(`Failed to fetch organizations: ${error.message || 'Unknown error'}`);
      setOrganizations([]);
    } finally {
      setLoading(prev => ({ ...prev, orgs: false }));
    }
  };

  const fetchCostCenters = async (organizationID) => {
    if (!organizationID) return;
    
    setLoading(prev => ({ ...prev, costCenters: true }));
    setCostCenters([]);
    setEmployees([]);
    
    try {
      const result = await erpService.getCostCenters(organizationID, '');
      
      if (result.success && result.data) {
        // Check if data is an error message string
        if (typeof result.data === 'string' && result.data.includes('Failed')) {
          toast.error('ERP API Error: ' + result.data);
          setCostCenters([]);
          return;
        }
        
        // Handle nested data structure
        let ccData = result.data;
        
        // Check if data has another nested data property
        if (ccData.data && Array.isArray(ccData.data)) {
          ccData = ccData.data;
        } else if (!Array.isArray(ccData)) {
          ccData = [ccData];
        }
        
        setCostCenters(ccData);
        
        if (ccData.length > 0) {
          toast.success(`Loaded ${ccData.length} divisions`);
        } else {
          toast.warning('No divisions found for this organization');
        }
      } else {
        toast.error('No division data received');
        setCostCenters([]);
      }
    } catch (error) {
      toast.error(`Failed to fetch cost centers: ${error.message || 'Unknown error'}`);
      setCostCenters([]);
    } finally {
      setLoading(prev => ({ ...prev, costCenters: false }));
    }
  };

  const fetchEmployees = async () => {
    if (!selectedOrgId || !selectedCostCenterId) {
      toast.warning('Please select both organization and division');
      return;
    }

    setLoading(prev => ({ ...prev, employees: true }));
    setEmployees([]);
    
    try {
      const result = await erpService.getEmployees(selectedOrgId, selectedCostCenterId);
      
      if (result.success && result.data) {
        // Check if data is an error message string
        if (typeof result.data === 'string' && result.data.includes('Failed')) {
          toast.error('ERP API Error: ' + result.data);
          setEmployees([]);
          return;
        }
        
        // Handle nested data structure
        let empData = result.data;
        
        // Check if data has another nested data property
        if (empData.data && Array.isArray(empData.data)) {
          empData = empData.data;
        } else if (!Array.isArray(empData)) {
          empData = [empData];
        }
        
        setEmployees(empData);
        toast.success(`Found ${empData.length} employees`);
      } else {
        toast.error('No employee data received');
        setEmployees([]);
      }
    } catch (error) {
      toast.error(`Failed to fetch employees: ${error.message || 'Unknown error'}`);
      setEmployees([]);
    } finally {
      setLoading(prev => ({ ...prev, employees: false }));
    }
  };

  const fetchEmployeeHierarchy = async () => {
    if (!searchEmployeeNo.trim()) {
      toast.warning('Please enter an employee number');
      return;
    }

    setLoading(prev => ({ ...prev, hierarchy: true }));
    setEmployeeHierarchy(null);
    
    try {
      const result = await erpService.getEmployeeHierarchy(searchEmployeeNo.trim());
      
      if (result.success && result.data) {
        // Handle nested data structure
        let hierarchyData = result.data;
        
        // Check if data has another nested data property
        if (hierarchyData.data) {
          hierarchyData = hierarchyData.data;
        }
        
        // If the result is an array, take the first employee (the searched employee)
        if (Array.isArray(hierarchyData) && hierarchyData.length > 0) {
          hierarchyData = hierarchyData[0];
          console.log('Using first employee from array:', hierarchyData);
        }
        
        console.log('Processed Employee Hierarchy:', hierarchyData);
        setEmployeeHierarchy(hierarchyData);
        toast.success('Employee hierarchy loaded');
      } else {
        toast.error('No employee hierarchy data received');
      }
    } catch (error) {
      toast.error(`Failed to fetch employee hierarchy: ${error.message || 'Unknown error'}`);
      console.error('Error fetching employee hierarchy:', error);
    } finally {
      setLoading(prev => ({ ...prev, hierarchy: false }));
    }
  };

  const importEmployee = async (erpEmployee) => {
    setLoading(prev => ({ ...prev, importing: true }));
    
    try {
      const userData = {
        userType: 'SLT',
        userId: erpEmployee.employeeNumber || erpEmployee.employeeNo || '',
        password: 'SLT@123',
        serviceNo: erpEmployee.employeeNumber || erpEmployee.employeeNo || '',
        name: `${erpEmployee.employeeFirstName || ''} ${erpEmployee.employeeSurname || ''}`.trim() || erpEmployee.employeeName || 'Unknown',
        designation: erpEmployee.employeeTitle || erpEmployee.designation || '',
        section: erpEmployee.employeeSection || erpEmployee.section || '',
        group: erpEmployee.employeeGroupName || erpEmployee.group || '',
        contactNo: erpEmployee.employeeMobilePhone || erpEmployee.contactNo || '',
        email: erpEmployee.employeeOfficialEmail || erpEmployee.email || '',
        role: 'User',
        branches: [],
        apiData: erpEmployee
      };

      await userManagementService.createUser(userData);
      toast.success(`Employee ${userData.name} imported successfully`);
    } catch (error) {
      if (error.message?.includes('duplicate') || error.message?.includes('already exists')) {
        toast.warning('Employee already exists in the system');
      } else {
        toast.error('Failed to import employee');
      }
    } finally {
      setLoading(prev => ({ ...prev, importing: false }));
    }
  };

  const handleOrgChange = (e) => {
    const orgName = e.target.value;
    // Find the organization by name
    const orgObj = organizations.find(o => 
      (o.organizationName || o.name || o.displayName) === orgName
    );
    
    setSelectedOrg(orgName);
    setSelectedCostCenter('');
    setSelectedCostCenterId('');
    setCostCenters([]);
    setEmployees([]);
    
    if (orgObj) {
      // Try different possible ID field names
      const orgId = orgObj.organizationID || orgObj.organizationId || orgObj.ORGANIZATION_ID || 
                    orgObj.orgId || orgObj.OrgId || orgObj.ORG_ID ||
                    orgObj.id || orgObj.Id || orgObj.ID ||
                    orgName; // fallback to name if no ID field found
      
      setSelectedOrgId(orgId);
      fetchCostCenters(orgId);
    } else {
      setSelectedOrgId('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">ERP Employee Management</h2>
            <p className="text-sm text-gray-500 mt-1">Import employees from ERP system</p>
          </div>
          <button
            onClick={fetchOrganizations}
            disabled={loading.orgs}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed shrink-0"
          >
            <FaSync className={loading.orgs ? 'animate-spin' : ''} />
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50">
        <button
          onClick={() => setActiveView('browse')}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeView === 'browse'
              ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FaUsers className="inline mr-2" />
          Browse by Organization
        </button>
        <button
          onClick={() => setActiveView('search')}
          className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
            activeView === 'search'
              ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FaSitemap className="inline mr-2" />
          Search Employee Hierarchy
        </button>
      </div>

      <div className="p-6">
        {activeView === 'browse' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FaBuilding className="inline mr-2 text-blue-600" />
                  Organization {loading.orgs && <span className="text-xs text-gray-500">(Loading...)</span>}
                  {!loading.orgs && organizations.length > 0 && <span className="text-xs text-gray-500">({organizations.length} found)</span>}
                </label>
                <select
                  value={selectedOrg}
                  onChange={handleOrgChange}
                  disabled={loading.orgs}
                  size="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed appearance-auto"
                  style={{ WebkitAppearance: 'menulist', MozAppearance: 'menulist' }}
                >
                  <option value="">Select Organization</option>
                  {organizations.map((org, idx) => (
                    <option key={idx} value={org.organizationName || org.name || org.displayName}>
                      {org.organizationName || org.name || org.displayName || `Organization ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Division {loading.costCenters && <span className="text-xs text-gray-500">(Loading...)</span>}
                  {!loading.costCenters && costCenters.length > 0 && <span className="text-xs text-gray-500">({costCenters.length} found)</span>}
                </label>
                <select
                  value={selectedCostCenter}
                  onChange={(e) => {
                    const ccValue = e.target.value;
                    setSelectedCostCenter(ccValue);
                    // Extract the actual cost center ID/code - try multiple field names
                    const ccObj = costCenters.find(cc => {
                      const ccCode = cc.costCenter || cc.costCenterCode || cc.code || cc.id;
                      return ccCode === ccValue;
                    });
                    if (ccObj) {
                      const ccId = ccObj.costCenter || ccObj.costCenterCode || ccObj.code || ccObj.id || ccValue;
                      setSelectedCostCenterId(ccId);
                    } else {
                      setSelectedCostCenterId('');
                    }
                  }}
                  disabled={!selectedOrg || loading.costCenters}
                  size="1"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed appearance-auto"
                  style={{ WebkitAppearance: 'menulist', MozAppearance: 'menulist' }}
                >
                  <option value="">Select Division</option>
                  {costCenters.map((cc, idx) => {
                    const displayName = cc.division || cc.divisionName || cc.costCenterName || cc.name || cc.displayName || `Division ${idx + 1}`;
                    const ccCode = cc.costCenter || cc.costCenterCode || cc.code || cc.id || `cc-${idx}`;
                    return (
                      <option key={idx} value={ccCode}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchEmployees}
                  disabled={!selectedOrgId || !selectedCostCenterId || loading.employees}
                  className="w-full px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center font-medium shadow-sm"
                >
                  {loading.employees ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Loading...
                    </>
                  ) : (
                    <>
                      <FaSearch className="mr-2" />
                      Search Employees
                    </>
                  )}
                </button>
              </div>
            </div>

            {employees.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">
                    Found {employees.length} Employee{employees.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {employees.map((emp, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {emp.employeeNumber || emp.employeeNo || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {emp.employeeFirstName && emp.employeeSurname 
                              ? `${emp.employeeFirstName} ${emp.employeeSurname}`
                              : emp.employeeName || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {emp.employeeTitle || emp.designation || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {emp.employeeOfficialEmail || emp.email || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {emp.employeeMobilePhone || emp.contactNo || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'search' && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Employee by Service Number
              </label>
              <div className="flex space-x-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchEmployeeNo}
                    onChange={(e) => setSearchEmployeeNo(e.target.value)}
                    placeholder="Enter Employee Number (e.g., 011349)"
                    className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && fetchEmployeeHierarchy()}
                  />
                </div>
                <button
                  onClick={fetchEmployeeHierarchy}
                  disabled={loading.hierarchy || !searchEmployeeNo.trim()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center font-medium"
                >
                  {loading.hierarchy ? (
                    <>
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    <>
                      <FaSearch className="mr-2" />
                      Search
                    </>
                  )}
                </button>
              </div>
            </div>

            {employeeHierarchy && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Employee Details & Hierarchy</h3>
                  <button
                    onClick={() => importEmployee(employeeHierarchy)}
                    disabled={loading.importing}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    <FaUserPlus className="mr-2" />
                    Import Employee
                  </button>
                </div>

                <div className="p-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide border-b border-gray-200 pb-2">Personal Information</h4>
                      <div className="space-y-3">
                        <InfoRow label="Employee No" value={employeeHierarchy.employeeNumber} />
                        <InfoRow label="Name" value={employeeHierarchy.employeeName || `${employeeHierarchy.employeeFirstName || ''} ${employeeHierarchy.employeeSurname || ''}`.trim()} />
                        <InfoRow label="Title" value={employeeHierarchy.employeeTitle || employeeHierarchy.designation} />
                        <InfoRow label="NIC" value={employeeHierarchy.nicNumber} />
                        <InfoRow label="DOB" value={employeeHierarchy.employeeDob || employeeHierarchy.dateOfBirth} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide border-b border-gray-200 pb-2">Work Information</h4>
                      <div className="space-y-3">
                        <InfoRow label="Organization" value={employeeHierarchy.organizationName || employeeHierarchy.orgName} />
                        <InfoRow label="Cost Center" value={employeeHierarchy.employeeCostCentreName} />
                        <InfoRow label="Division" value={employeeHierarchy.employeeDivision || employeeHierarchy.empDivision || employeeHierarchy.divisionHead} />
                        <InfoRow label="Section" value={employeeHierarchy.employeeSection || employeeHierarchy.empSection || employeeHierarchy.sectionHead} />
                        <InfoRow label="Salary Grade" value={employeeHierarchy.employeeSalaryGrade || employeeHierarchy.gradeName} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide border-b border-gray-200 pb-2">Contact Information</h4>
                      <div className="space-y-3">
                        <InfoRow label="Office Phone" value={employeeHierarchy.employeeOfficePhone} />
                        <InfoRow label="Mobile" value={employeeHierarchy.employeeMobilePhone || employeeHierarchy.mobileNo} />
                        <InfoRow label="Email" value={employeeHierarchy.employeeOfficialEmail || employeeHierarchy.email} />
                        <InfoRow label="Address" value={employeeHierarchy.employeeOfficialAddress} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-800 text-sm uppercase tracking-wide border-b border-gray-200 pb-2">Hierarchy Information</h4>
                      <div className="space-y-3">
                        <InfoRow label="Supervisor" value={employeeHierarchy.supervisorName || employeeHierarchy.employeeSupervisorNumber} />
                        <InfoRow label="Supervisor Grade" value={employeeHierarchy.supervisorSalaryGrade} />
                        <InfoRow label="Status" value={employeeHierarchy.activeAssignmentStatus} />
                        <InfoRow label="Group" value={employeeHierarchy.employeeGroupName || employeeHierarchy.empGroup || employeeHierarchy.groupHead} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between text-sm py-1">
    <span className="text-gray-600 font-medium">{label}:</span>
    <span className="text-gray-900">{value || 'N/A'}</span>
  </div>
);

export default ErpEmployeeImport;
