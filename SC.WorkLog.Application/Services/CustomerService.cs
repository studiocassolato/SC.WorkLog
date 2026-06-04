using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.Customers;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class CustomerService
    {
        private readonly IRepository<Customer> _customers;

        public CustomerService(IRepository<Customer> customers)
        {
            _customers = customers;
        }

        public async Task<List<CustomerListItemDto>> GetCustomersAsync(WorkLogUserContext userContext)
        {
            var customers = await _customers.Get(x => true, sortOrder: x => x.CompanyName);
            return customers.Select(MapListItem).ToList();
        }

        public async Task<List<CustomerListItemDto>> SearchCustomersAsync(string search, WorkLogUserContext userContext)
        {
            if (string.IsNullOrWhiteSpace(search))
                return await GetCustomersAsync(userContext);

            var value = search.Trim();
            var customers = await _customers.Get(x => x.CompanyName.Contains(value) || (x.CompanyDomain != null && x.CompanyDomain.Contains(value)) || x.ContactPerson.Contains(value), sortOrder: x => x.CompanyName);

            return customers.Select(MapListItem).ToList();
        }

        public async Task<CustomerDetailDto> GetCustomerDetailAsync(Guid customerId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.Required(customerId, nameof(customerId));
            return MapDetail(await GetCustomerOrThrow(customerId));
        }

        public async Task<CustomerDetailDto> CreateCustomerAsync(CreateCustomerRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateCustomerAsync));
            Validate(request.CompanyName, request.ContactPerson);
            var customer = new Customer(request.CompanyName, request.CompanyDomain, request.ContactPerson, request.ContactEmail, request.ContactPhone, CurrentUser(userContext));
            if (!request.Active)
                customer.Update(customer.CompanyName, customer.CompanyDomain, customer.ContactPerson, customer.ContactEmail, customer.ContactPhone, false, CurrentUser(userContext));
            await _customers.InsertAsync(customer);
            return MapDetail(customer);
        }

        public async Task<CustomerDetailDto> UpdateCustomerAsync(UpdateCustomerRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateCustomerAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            Validate(request.CompanyName, request.ContactPerson);
            var customer = await GetCustomerOrThrow(request.Id);
            customer.Update(request.CompanyName, request.CompanyDomain, request.ContactPerson, request.ContactEmail, request.ContactPhone, request.Active, CurrentUser(userContext));
            await _customers.InsertOrReplace(customer);
            return MapDetail(customer);
        }

        private async Task<Customer> GetCustomerOrThrow(Guid customerId)
        {
            var customer = await _customers.GetSingleOrDefaultAsync(x => x.Id == customerId);
            if (customer == null)
                throw new ArgumentException("Customer not found.");
            return customer;
        }

        private static void Validate(string companyName, string contactPerson)
        {
            WorkLogApplicationValidation.Required(companyName, nameof(companyName));
            WorkLogApplicationValidation.Required(contactPerson, nameof(contactPerson));
        }

        private static CustomerListItemDto MapListItem(Customer customer)
        {
            return new CustomerListItemDto
            {
                Id = customer.Id,
                CompanyName = customer.CompanyName,
                CompanyDomain = customer.CompanyDomain,
                ContactPerson = customer.ContactPerson,
                ContactEmail = customer.ContactEmail,
                ContactPhone = customer.ContactPhone,
                Active = customer.Active
            };
        }

        private static CustomerDetailDto MapDetail(Customer customer)
        {
            return new CustomerDetailDto
            {
                Id = customer.Id,
                CompanyName = customer.CompanyName,
                CompanyDomain = customer.CompanyDomain,
                ContactPerson = customer.ContactPerson,
                ContactEmail = customer.ContactEmail,
                ContactPhone = customer.ContactPhone,
                Active = customer.Active
            };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
