﻿using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Web;
using ProjectsMap.WebApi.DTOs;
using ProjectsMap.WebApi.Mappers;
using ProjectsMap.WebApi.Models;
using ProjectsMap.WebApi.Repositories.Abstract;
using ProjectsMap.WebApi.Services.Abstract;

namespace ProjectsMap.WebApi.Services
{
    public class EmployeeService : IEmployeeService
    {
        private IEmployeeRepository _repository;

        public EmployeeService(IEmployeeRepository repository)
        {
            _repository = repository;
        }

        public IEnumerable<EmployeeDto> GetAllEmployees()
        {
            var list = new List<EmployeeDto>();
            foreach (var dev in _repository.Employees)
            {
                list.Add(DTOMapper.GetEmployeeDto(dev));
            }

            return list;
        }

        public EmployeeDto GetEmployee(int id)
        {
            var developer = _repository.Get(id);
            if (developer == null)
                return null;

            return DTOMapper.GetEmployeeDto(developer);
        }

        public IEnumerable<EmployeeDto> GetDevelopersByTechnology(string technology)
        {
            var list = _repository.Employees.Where(x => x.Technologies.Select(t => t.Name).ToList().Contains(technology)).ToList();

            if (list.Count() > 0)
            {
                var dtoS = list.Select(dev => DTOMapper.GetEmployeeDto(dev)).ToList();
                return dtoS;
            }
            else
            {
                return null;
            }
        }

        public int Post(EmployeeDto employee)
        {
           return  _repository.Add(employee);
        }

        public void Delete(Employee employee)
        {
            _repository.Delete(employee);
        }

        public void Update(Employee employee)
        {
            _repository.Update(employee);
        }

        public IEnumerable<EmployeeDto> GetEmployeesByQuery(string query)
        {
            //Query by id
            List<Employee> result;
            if (int.TryParse(query, out int n))
            {
                result = _repository.Employees.Where(e => e.EmployeeId.ToString().StartsWith(query)).ToList();
            }
            else
            {
                result = _repository.Employees.Where(e => e.FirstName.StartsWith(query) || e.Surname.StartsWith(query))
                    .ToList();
            }

            var dtos = new List<EmployeeDto>();
            foreach (var entity in result)
            {
                dtos.Add(DTOMapper.GetEmployeeDto(entity));
            }

            return dtos;
        }
    }
}