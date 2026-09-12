

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">Mini Operations ERP</h1>
          <p className="text-blue-100">Production-oriented Operations Management System</p>
        </div>
        
        <div className="p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 border-b pb-2">Business Modules</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['Inventory', 'Work Orders', 'Material Stock Check', 'Internal Transfers', 'Customer Orders'].map((module, idx) => (
              <div key={idx} className="p-4 border rounded-lg hover:border-blue-500 hover:shadow-md transition-all cursor-pointer bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                    {idx + 1}
                  </div>
                  <span className="font-medium text-gray-700">{module}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-center space-x-4">
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Login
            </button>
            <button className="px-6 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              API Documentation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
